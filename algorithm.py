from transformers import AutoTokenizer, AutoModelForCausalLM

# Load pre-trained model and tokenizer
model_name = "MathGenie/MathCoder2-DeepSeekMath-7B"  # Adjust this if needed
tokenizer = AutoTokenizer.from_pretrained(model_name)

# Attempt to load the model on CPU
try:
    model = AutoModelForCausalLM.from_pretrained(model_name, device_map="cpu")
except Exception as e:
    print(f"Error loading model: {e}")

# Prepare input prompt
prompt = "Solve for x in the equation 2x + 3 = 7."
inputs = tokenizer(prompt, return_tensors="pt")

# Generate output
try:
    outputs = model.generate(**inputs)
    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print(generated_text)
except Exception as e:
    print(f"Error during generation: {e}")
