from sympy import *
from sympy.calculus.util import continuous_domain, function_range
from IPython.display import display

x= symbols('x')
expr = x**2/(x - 1)

def silent_eval(operation, default=None):
    """Evaluate operation silently, return default on failure"""
    try:
        result = operation()
        return result if result is not None else default
    except:
        return default

categories = {
    "Alternate form": [
        silent_eval(lambda: factor(expr)),
        silent_eval(lambda: simplify(expr)),
    ],    
    "Expanded Forms": [
        silent_eval(lambda: expand(expr)),
        silent_eval(lambda: expand_trig(expr)),
        silent_eval(lambda: expand_log(expr)),
        silent_eval(lambda: expand_power_exp(expr)),
    ],
    "Trig Forms": [
        silent_eval(lambda: expr.rewrite(sin)),
        silent_eval(lambda: expr.rewrite(cos)),
        silent_eval(lambda: expr.rewrite(tan)),
    ],
    #"e log and i forms": [    
    #    silent_eval(lambda: expr.rewrite(exp)),
    #],
    "Partial Fraction Expansion": [
        silent_eval(lambda: apart(expr) if expr.is_rational_function() else expr),
    ],
    "Roots": [
    silent_eval(lambda: [f"x = {i}" for i in solve(expr, x)] if solve(expr, x) else ["No real roots"]),
    silent_eval(lambda: roots(expr, x) if expr.is_polynomial(x) else None),
    ],
    "Properties": [
        silent_eval(lambda: continuous_domain(expr, x, S.Reals)),
        silent_eval(lambda: function_range(expr, x, S.Reals)),
        silent_eval(lambda: is_increasing(expr, S.Reals, x)),
        silent_eval(lambda: is_decreasing(expr, S.Reals, x)),
    ],
    #"Derivative": [
    #    silent_eval(lambda: diff(expr, x)),
    #],
    #"Integration": [
    #    silent_eval(lambda: integrate(expr, x)),    
    #],
    "Limits": [
        silent_eval(lambda: limit(expr, x, 0)),
        silent_eval(lambda: limit(expr, x, oo)),
    ],
    "Series": [
        silent_eval(lambda: series(expr, x, 0, 10).removeO()),
        silent_eval(lambda: series(expr, x, oo, 10).removeO()),
    ]
}


# Global tracking of seen expressions
seen_expressions = {str(expr)}
unique_expressions_grouped = {}

for category, expr_list in categories.items():
    unique_exprs = []
    for e in expr_list:
        if e is not None:
            expr_str = str(e)
            if expr_str not in seen_expressions:
                seen_expressions.add(expr_str)
                unique_exprs.append(e)
    
    if unique_exprs:
        unique_expressions_grouped[category] = unique_exprs

display(expr)
for category, exprs in unique_expressions_grouped.items():
    print(f"\n=== {category} ===")
    for i, e in enumerate(exprs, 1):
        try:
            display(e)
        except:
            print(e)