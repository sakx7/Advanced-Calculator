import requests
from bs4 import BeautifulSoup
import logging
from tqdm import tqdm
import time
from urllib.parse import urljoin


def get_function_name(element):
    while element.find("span", recursive=False):
        element = element.find("span", recursive=False)
    function_name = element.get_text(strip=True)
    return function_name if function_name else "Unnamed Function/Method"


def get_section_name(element):
    for header in element.find_all_previous(["h1", "h2", "h3", "h4", "h5", "h6"]):
        return header.get_text(strip=True)
    return "No Section Name"


def scrape_functions_from_page(url, base_url, file, indent_level=0):
    try:
        #logging.info(f"Fetching page: {url}")
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        main_content = soup.select_one(
            "html body div.page div.main div.content div.article-container article#furo-main-content > section"
        )
        if main_content:
            for element in main_content.find_all("dl", class_=["py function", "py method","py property"]):
                section_name = get_section_name(element)
                function_name_span = element.find("dt", class_="sig sig-object py").find("span", class_="sig-name descname")
                if function_name_span:
                    function_name = get_function_name(function_name_span)
                    file.write(" " * indent_level + f"- [{section_name}] {function_name}()\n")
        else:
            logging.warning("No main section found in article#furo-main-content")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error fetching page {url}: {e}")




def process_toctree_item(item, base_url, file, indent_level=0, visited_urls=None):
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
        file.write(" " * indent_level + f"- {item_name}\n")
        logging.info(f"{' ' * indent_level}- Fetching page: {item_name}")
        scrape_functions_from_page(full_url, base_url, file, indent_level + 3)
        if "has-children" in item.get("class", []):
            children = item.find_all(class_=lambda x: x and x.startswith("toctree-l"))
            for child in children:
                process_toctree_item(child, base_url, file, indent_level + 3, visited_urls)

def scrape_sympy_functions():
    base_url = "https://docs.sympy.org/latest/reference/index.html"
    try:
        #logging.info("Fetching SymPy documentation index...")
        response = requests.get(base_url)
        response.raise_for_status()
        #logging.info("Parsing HTML content from the documentation index...")
        soup = BeautifulSoup(response.text, "html.parser")
        with open("sympy_docs_index.html", "w", encoding="utf-8") as file:
            file.write(soup.prettify())
        api_reference_section = soup.find("a", string="API Reference")
        if api_reference_section:
            api_reference_list = api_reference_section.find_next("ul")
            if api_reference_list:
                modules = api_reference_list.find_all("li", class_="toctree-l2")
                #logging.info(f"Found {len(modules)} top-level modules under 'API Reference'.")
                with open("sympy_functions.txt", "w", encoding="utf-8") as file:
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
    scrape_sympy_functions()


