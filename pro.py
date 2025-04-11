from latex2sympy2 import latex2sympy
import sympy
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/process_math', methods=['POST'])
def process_math():
    try:
        data = request.json
        if not data:
            print("No JSON data in the request.")
            return jsonify({"error": "Request must contain JSON data."}), 400

        latex_display = data.get('latexDisplay')
        parameter = data.get('parameter')

        if not latex_display:
            print("Missing 'latexDisplay' in request data.")
            return jsonify({"error": "Missing 'latexDisplay' in request data."}), 400

        print(f"Processing LaTeX expression: {latex_display}")
        try:
            expr = latex2sympy(latex_display)
            print(f"Converted to sympy expression: {expr}")
        except Exception as e:
            print(f"Error in latex2sympy conversion: {str(e)}")
            return jsonify({"error": f"Invalid LaTeX expression: {str(e)}"}), 400

        if parameter:
            print(f"Parameter provided for operation: {parameter}")
            try:
                # Parse the parameter string to extract the function and arguments
                if '(' in parameter and ')' in parameter:
                    func_name = parameter.split('(')[0]  # Extract function name
                    args_str = parameter.split('(')[1].split(')')[0]  # Extract arguments
                    args = [arg.strip() for arg in args_str.split(',')]  # Split arguments

                    # Get the function from SymPy
                    func = getattr(sympy, func_name, None)
                    if func and callable(func):
                        # Replace 'eq' with the actual expression
                        if 'eq' in args:
                            eq = expr[0] if isinstance(expr, list) else expr
                            args = [eq if arg == 'eq' else sympy.symbols(arg) for arg in args]

                        # Evaluate the function with the arguments
                        result = func(*args)
                        print(f"Operation result: {result}")
                        return jsonify({"result": str(result)}), 200
                    else:
                        print(f"Unsupported or invalid function: {func_name}")
                        return jsonify({"error": f"Unsupported or invalid function: {func_name}"}), 400
                else:
                    print(f"Invalid parameter format: {parameter}")
                    return jsonify({"error": f"Invalid parameter format: {parameter}"}), 400
            except Exception as e:
                print(f"Error executing operation: {str(e)}")
                return jsonify({"error": f"Error executing operation: {str(e)}"}), 400
        else:
            print("No parameter provided, simplifying the expression.")
            result = sympy.simplify(expr)
            print(f"Simplified result: {result}")
            return jsonify({"result": str(result)}), 200

    except Exception as e:
        print(f"Error during request processing: {str(e)}")
        return jsonify({"error": f"Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000)
