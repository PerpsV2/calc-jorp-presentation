function i(el, args) {
    el.classList.add("in");
    el.classList.remove("left");
    el.classList.remove("right");
    el.classList.remove("up");
    el.classList.remove("down");
}

function left(el, args) {
    el.classList.add("left");
    el.classList.remove("in");
    el.classList.remove("right");
}

function right(el, args) {
    el.classList.add("right");
    el.classList.remove("in");
    el.classList.remove("left");
}

function up(el, args) {
    el.classList.add("up");
    el.classList.remove("in");
    el.classList.remove("down");
}

function down(el, args) {
    el.classList.add("down");
    el.classList.remove("in");
    el.classList.remove("up");
}

function show(el, args) {
    el.classList.add("show");
    el.classList.remove("hide");
}

function hide(el, args) {
    el.classList.add("hide");
    el.classList.remove("show");
}

function play(el, args) {
    el.play();
}

function calculator(el, args) {
    window.calcEl = window.Desmos.GraphingCalculator(el);
}

function euler(el, args) {
    var calc = window.calcEl;
    calc.setExpression({id:'graph1', latex:'f(x,y)=\\frac{1}{10}x'});
    calc.setExpression({id:'graph2', latex:'y=\\frac{1}{20}x^2+C'});
    calc.setExpression({id:'graph3', latex:'C=y_0'});
    calc.setExpression({id:'graph4', latex:'y_0=3'});
    calc.setExpression({id:'graph5', latex:'x_0=0'});
    calc.setExpression({id:'graph6', latex:'h=0.7'});
    var yValues = ['y_0'];
    for (var i = 0; i < args[0]; ++i) {
        calc.setExpression({id:'graph' + (i + 7), latex:'y_{' + (i + 1) + '}=y_{' + i + '}+hf(x_{' + i + '},y_{' + i +'})'});
        yValues.push('y_{' + (i + 1) + '}')
    }
    var xValues = ['x_0'];
    for (var i = 0; i < args[0]; ++i) {
        calc.setExpression({id:'graph' + (i + 7 + args[0]), latex:'x_{' + (i + 1) + '}=x_{' + i + '}+h'});
        xValues.push('x_{' + (i + 1) + '}');
    }
    calc.setExpression({
        id:'graph' + (i + 7 + args[0] * 2),
        type: 'table',
        columns: [
          {
            latex: 'x',
            values: xValues,
            points: true,
            lines: true
          },
          {
            latex: 'y',
            values: yValues,
            points: true,
            lines: true
          }
        ]
      });
}

function conic(el, args) {
    var calc = window.calcEl;
    var defaultState = {"version":0,"graph":{"showGrid":true,"polarMode":true,"showXAxis":true,"showYAxis":true,"xAxisStep":0,"yAxisStep":0,"xAxisMinorSubdivisions":0,"yAxisMinorSubdivisions":0,"degreeMode":false,"xAxisArrowMode":"NONE","yAxisArrowMode":"NONE","xAxisLabel":"","yAxisLabel":"","xAxisNumbers":true,"yAxisNumbers":true,"polarNumbers":true,"projectorMode":false,"squareAxes":true,"viewport":{"xmin":-5.285,"ymin":-4.14,"xmax":12.493,"ymax":8.674}},"expressions":{"list":[]}};
    calc.setState(defaultState);
    calc.setExpression({id:'graph1', latex:'r(\\theta)=\\frac{l}{1-\\varepsilon\\cos{(\\theta-\\theta_0)}}'});
    calc.setExpression({id:'graph2', latex:'l=1'});
    calc.setExpression({id:'graph3', latex:'\\varepsilon=0.6'});
    calc.setExpression({id:'graph4', latex:'\\theta_0=0'});
}

function trans(el, args) {
    if (args.length <= 0) {
        el.classList.add("trans");
    }
    else el.style.transitionDuration = String(args[0]);
}

function line(el, args) {
    el.classList.remove("trans");
    el.style.transitionDuration = "0";
}

window.i = i;
window.left = left;
window.up = up;
window.right = right;
window.down = down;
window.show = show;
window.hide = hide;
window.trans = trans;
window.line = line;
window.play = play;
window.calculator = calculator;
window.euler = euler;
window.conic = conic;