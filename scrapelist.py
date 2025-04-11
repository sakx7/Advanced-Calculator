import requests
from bs4 import BeautifulSoup
import logging
from tqdm import tqdm
import time
from urllib.parse import urljoin



logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')


def get_function_name(element):
    while element.find("span", recursive=False):
        element = element.find("span", recursive=False)
    function_name = element.get_text(strip=True)
    return function_name if function_name else "Unnamed Function/Method"

def clean_text(element):
    """Removes unnecessary symbols (e.g., ¶) and extracts clean text."""
    for unwanted in element.find_all("span", {"aria-hidden": "true"}):
        unwanted.extract()  # Remove ¶ or similar elements
    return element.get_text(strip=True)

def scrape_functions_from_page(url, file):
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        main_content = soup.select_one(
            "html body div.page div.main div.content div.article-container article#furo-main-content > section"
        )
        if not main_content:
            logging.warning(f"No main content section found on the page: {url}")
            return
        
        elements = main_content.find_all("dl", class_=["py function", "py method", "py property", "py class"])
        
        current_section = None  # To track the current section
        current_class = None  # To track the current class name

        for idx, element in enumerate(elements, start=1):
            element_classes = element.get("class", [])
            
            # Extract the function or method name
            name_span = element.find("dt", class_="sig sig-object py").find("span", class_="sig-name descname")
            if not name_span:
                logging.warning(f"Name span not found for element {idx}. Skipping this element.")
                continue
            
            name = name_span.get_text(strip=True)
            section = element.find_previous(["h1", "h2", "h3", "h4", "h5", "h6"])
            if section:
                section_text = next(section.stripped_strings)
                if section_text != current_section:
                    current_section = section_text
                    current_class = None  # Reset class when the section changes
            # Check if this is a class definition
            #if "class" in element_classes:
            #    current_class = name  # Update the current class name
            #    file.write(f"{name}~class\n")
            # Check for methods or properties within a class
           
            if "method" in element_classes or "property" in element_classes:
                if current_class:
                    file.write(f"{current_class}.{name}~{element_classes[1]}\n")
                else:
                    # If no current class, use section as a fallback
                    file.write(f"{current_section}.{name}~{element_classes[1]}\n")
            # Handle standalone functions
            elif "function" in element_classes:
                    file.write(f"{name}~function\n")  # Write without parentheses
        
    except requests.exceptions.RequestException as e:
        logging.error(f"HTTP request error while fetching URL {url}: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

def process_toctree_item(item, base_url, file,visited_urls=None):
    if visited_urls is None:
        visited_urls = set() 
    link = item.find("a")
    if link:
        item_name = link.get_text(strip=True)
        item_url = link.get("href")
        if item_url.startswith("http"):
            full_url = item_url
        else:
            full_url = urljoin(base_url, item_url)
        if full_url in visited_urls:
            return
        visited_urls.add(full_url)
        #logging.info(f"{' ' * indent_level}- Fetching page: {item_name}")
        scrape_functions_from_page(full_url, file)
        if "has-children" in item.get("class", []):
            children = item.find_all(class_=lambda x: x and x.startswith("toctree-l"))
            for child in children:
                process_toctree_item(child, base_url, file,visited_urls)

def scrape_sympy_functions():
    base_url = "https://docs.sympy.org/latest/reference/index.html"
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        with open("sympy_docs_index.html", "w", encoding="utf-8") as file:
            file.write(soup.prettify())
        api_reference_section = soup.find("a", string="API Reference")
        if api_reference_section:
            api_reference_list = api_reference_section.find_next("ul")
            if api_reference_list:
                modules = api_reference_list.find_all("li", class_="toctree-l2")
                with open("sympy_list.txt", "w", encoding="utf-8") as file:
                    for section in tqdm(modules, desc="Modules", unit="module"):
                        process_toctree_item(section, base_url, file)
                logging.info("Scraping complete!")
                return True
            else:
                logging.error("API Reference list not found.")
                return False
        else:
            logging.error("'API Reference' section not found on the page.")
            return False
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching documentation index: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    #with open('test.txt','w',encoding='utf-8') as file:
    #    scrape_functions_from_page('https://docs.sympy.org/latest/modules/combinatorics/permutations.html#sympy.combinatorics.permutations.Permutation.cardinality',file)
    scrape_sympy_functions()
