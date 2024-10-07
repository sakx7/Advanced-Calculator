import logging
import torch
import re
from transformers import AutoModelForCausalLM, AutoTokenizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model_name = "distilgpt2"  # Smaller and faster model
logger.info(f"Loading model: {model_name}")

# Load the model
try:
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        trust_remote_code=True,
        torch_dtype=torch.float16,  # Use float16 for better performance
        low_cpu_mem_usage=True
    ).to('cuda')  # Move the model to GPU
    logger.info("Model loaded successfully to GPU")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    raise

# Load the tokenizer
try:
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    logger.info("Tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Error loading tokenizer: {str(e)}")
    raise

def extract_answer(response):
    # Modify the regex based on expected output format
    match = re.search(r"final answer:\s*([\d\.\-]+)", response)
    return match.group(1) if match else "No answer found"

def solve_math_problem(problem, parameter=None):
    logger.debug(f"Received problem: {problem}")
    logger.debug(f"Received parameter: {parameter}")

    # Adjust the prompt to improve clarity
    prompt = f"Solve this math problem and provide only the final answer: {problem}"
    if parameter:
        prompt += f" Context: {parameter}"
    logger.debug(f"Constructed prompt: {prompt}")

    try:
        logger.debug("Tokenizing input")
        inputs = tokenizer(prompt, return_tensors="pt").to('cuda')  # Move inputs to GPU

        logger.debug("Generating response")
        with torch.no_grad():
            outputs = model.generate(**inputs, max_new_tokens=50)

        logger.debug("Decoding response")
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.debug(f"Raw model response: {response}")

        answer = extract_answer(response)
        logger.info(f"Extracted answer: {answer}")
        return answer
    except Exception as e:
        logger.error(f"Error in solve_math_problem: {str(e)}")
        raise

# Test the function with a math problem
result = solve_math_problem("[[a,b],[c,d]]*[[a,b],[c,d]]")
print(result)
