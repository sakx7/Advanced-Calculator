from latex2sympy2 import *
from sympy import *
from flask import Flask, request, jsonify
from flask_cors import CORS
import re

app = Flask(__name__)
CORS(app)
count=0
def is_latex_command_before(s, i):
    """Check if there's a LaTeX command before the '{' at position i"""
    k=i-1
    if s[k] == '}':
        brace_depth = 1
        m = k - 1
        while m>=0 and brace_depth>0:
            #print(s[m])
            if s[m]=='}':
                brace_depth+=1
            elif s[m] == '{':
                brace_depth-=1
            m-=1       
        if s[m-4:m+1] == list('\\frac'):
            #print("Valid \\frac denom found")
            return True
        elif s[m-5:m+1] == list('\\binom'):
            #print("Valid \\frac denom found")
            return True
    if s[k] in ['^', '_']:
        #print(f"Found LaTeX special '{s[k]}' before '{{' at index {i}")
        return True
    if not s[k].isalpha():
        return False
    end = k
    while k >= 0 and s[k].isalpha():
        k -= 1
    if k >= 0 and s[k] == '\\':
        command = ''.join(s[k+1:end+1])
        #print(f"Found LaTeX command '\\{command}' before '{{' at index {i}")
        return True
    return False
def filter_braces(s):
    #print('filtering')
    s = re.sub(r'\\left\.', '', s)
    s = re.sub(r'\\right\.', '', s)
    s = re.sub(r'\\left\(', '(', s)
    s = re.sub(r'\\right\)', ')', s)
    s = re.sub(r'\\left\[', '[', s)
    s = re.sub(r'\\right\]', ']', s)
    s = re.sub(r'\\left\{', '{', s)
    s = re.sub(r'\\right\}', '}', s)
    #print(f"Input string: {s}")
    s = list(s)
    i = 0
    while i < len(s):
        if s[i] == '{':
            #print(f"\nFound '{{' at index {i}")
            #print(''.join(s[0:i+1]))
            #print(" " * (len(''.join(s[0:i+1])) - 1) + "^")
            depth = 1
            for j in range(i + 1, len(s)):
                if s[j] == '{':
                    depth += 1
                elif s[j] == '}':
                    depth -= 1
                    if depth == 0:
                        substring = s[i + 1:j]
                        count_open = substring.count('{')
                        count_close = substring.count('}')
                        content = ''.join(substring)
                        #print(f"  Found matching '}}' at index {j}")
                        #print(''.join(s[0:j+1]))
                        #print(" " * (len(''.join(s[0:j+1])) - 1) + "^")
                        #print(f"    Substring: '{content}'")
                        #print(f"    Count '{{' inside: {count_open}, Count '}}' inside: {count_close}")                        
                        if is_latex_command_before(s, i):
                            break
                        if count_open == count_close:
                            #print(f"    Deleting '{{' at {i} and '}}' at {j}")
                            del s[j]
                            del s[i]
                            i -= 1
                            #print(''.join(s))
                        break
            #print("-----------------------")
        i += 1

    result = ''.join(s)
    result = re.sub(r'\^{(\d)}', r'^\1', result)
    #print(f"\nResulting filter: {result}")
    return result

@app.route('/process_math', methods=['POST'])
def process_math():
    global count
    print(f"-------------------------Request {count}-----------------------------")
    count+=1
    try:
        data = request.json
        if not data:
            print("No JSON data in the request.")
            return jsonify({"error": "Request must contain JSON data."}), 400
        latex_display = filter_braces(data.get('latexDisplay'))
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
                if '(' in parameter and ')' in parameter:
                    func_name = parameter.split('(')[0]
                    args_str = parameter.split('(')[1].split(')')[0]
                    args = [arg.strip() for arg in args_str.split(',')]
                    func = getattr(sympy, func_name, None)
                    if func and callable(func):
                        if 'eq' in args:
                            eq = expr[0] if isinstance(expr, list) else expr
                            args = [eq if arg == 'eq' else sympy.symbols(arg) for arg in args]
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
