from latex2sympy2 import latex2sympy
import sympy
from sympy import *
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/process_math', methods=['POST'])
def process_math():
    try:
        data = request.json
        latex_display = data['latexDisplay']
        parameter = data['paramater']
        expr = latex2sympy(latex_display)
        operation = getattr(sympy, parameter, None)
        if operation and callable(operation):
            result = operation(expr)
            return jsonify({"result": str(result)})
        else:
            return jsonify({"error": f"Unsupported operation: {parameter}"})
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"})

if __name__ == '__main__':
    app.run(port=5000)
