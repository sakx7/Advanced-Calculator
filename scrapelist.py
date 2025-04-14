import requests
from bs4 import BeautifulSoup
import logging
from tqdm import tqdm
import time
from urllib.parse import urljoin
import sys
import io
import json

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

import importlib

def get_deep_attr(obj, path):
    for part in path:
        obj = getattr(obj, part)
    return obj

def get_docstring_from_qualified_name(qualified_name: str):
    try:
        parts = qualified_name.split(".")
        for i in range(len(parts), 0, -1):
            try:
                module = importlib.import_module(".".join(parts[:i]))
                obj = get_deep_attr(module, parts[i:])
                return obj.__doc__ or "No description available"
            except (ModuleNotFoundError, AttributeError):
                continue
        return "Doc not available."
    except Exception as e:
        return f"Doc not available: {e}"



def get_function_name(element):
    while element.find("span", recursive=False):
        element = element.find("span", recursive=False)
    return element.get_text(strip=True) or "Unnamed Function/Method"

def clean_text(element):
    for unwanted in element.find_all("span", {"aria-hidden": "true"}):
        unwanted.extract()
    return element.get_text(strip=True)

def scrape_functions_from_page(url, functions_data):
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
        current_section = None
        current_class = None

        for idx, element in enumerate(elements, start=1):
            element_classes = element.get("class", [])
            name_span = element.find("dt", class_="sig sig-object py").find("span", class_="sig-name descname")
            if not name_span:
                logging.warning(f"Name span not found for element {idx}. Skipping this element.")
                continue

            name = name_span.get_text(strip=True)
            section = element.find_previous(["h1", "h2", "h3", "h4", "h5", "h6"])

            sig_obj = element.find("dt", class_="sig sig-object py")
            if sig_obj and sig_obj.get('id'):
                fullname = sig_obj.get('id')
            else:
                desc_classname = element.find(class_="sig-prename descclassname")
                desc_name = element.find(class_="sig-name descname")
                classname_text = desc_classname.get_text(strip=True) if desc_classname else ""
                name_text = desc_name.get_text(strip=True) if desc_name else ""
                fullname = classname_text + name_text

            if section:
                section_text = next(section.stripped_strings)
                if section_text != current_section:
                    current_section = section_text
                    current_class = None  # reset on new section

                entry_type = None
                if "function" in element_classes:
                    entry_type = "function"
                elif "method" in element_classes:
                    entry_type = "method"
                elif "property" in element_classes:
                    entry_type = "property"

                # Update current_class if it's a class definition
                if "class" in element_classes:
                    current_class = fullname

                if entry_type is not None:
                    if entry_type in ["method", "property"]:
                        qualified_name = f"{current_class}.{name}" if current_class else f"{current_section}.{name}"
                        description = get_docstring_from_qualified_name(qualified_name)
                    else:  # function
                        qualified_name = fullname
                        description = get_docstring_from_qualified_name(qualified_name)

                    entry = {
                        "name": name,
                        "full_id": qualified_name,
                        "type": entry_type,
                        "description": description,
                        "section": current_section,
                        "url": url,
                        }
                    functions_data.append(entry)


    except requests.exceptions.RequestException as e:
        logging.error(f"HTTP request error while fetching URL {url}: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")

def process_toctree_item(item, base_url, functions_data, visited_urls=None):
    if visited_urls is None:
        visited_urls = set()
    link = item.find("a")
    if link:
        item_name = link.get_text(strip=True)
        item_url = link.get("href")
        full_url = item_url if item_url.startswith("http") else urljoin(base_url, item_url)
        if full_url in visited_urls:
            return
        visited_urls.add(full_url)
        scrape_functions_from_page(full_url, functions_data)
        if "has-children" in item.get("class", []):
            children = item.find_all(class_=lambda x: x and x.startswith("toctree-l"))
            for child in children:
                process_toctree_item(child, base_url, functions_data, visited_urls)

def scrape_sympy_functions():
    base_url = "https://docs.sympy.org/latest/reference/index.html"
    try:
        response = requests.get(base_url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        api_reference_section = soup.find("a", string="API Reference")
        if api_reference_section:
            api_reference_list = api_reference_section.find_next("ul")
            if api_reference_list:
                modules = api_reference_list.find_all("li", class_="toctree-l2")
                functions_data = []
                for section in tqdm(modules, desc="Modules", unit="module"):
                    process_toctree_item(section, base_url, functions_data)

                # Save JSON
                with open("sympy_functions.json", "w", encoding="utf-8") as json_file:
                    json.dump(functions_data, json_file, ensure_ascii=False, indent=2)

                logging.info("Scraping complete and saved to sympy_functions.json!")
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
    #functions_data = []
    #scrape_functions_from_page(
    #    'https://docs.sympy.org/latest/modules/assumptions/index.html',
    #    functions_data
    #)
    #with open("test_single_page.json", "w", encoding="utf-8") as json_file:
    #    json.dump(functions_data, json_file, ensure_ascii=False, indent=2)

    #scrape all:
    scrape_sympy_functions()
