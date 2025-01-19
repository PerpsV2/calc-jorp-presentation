// --- HELPER FUNCTIONS ---

function isLetter(char) {
    return char.length === 1 && char.match(/[a-z]/i);
}

function isQuote(char) {
    return char.length === 1 && char.match(/["']/);
}

function isKeywordChar(char) {
    return char.length === 1 && char.match(/[a-z0-9_-]/i)
}

function isOperator(char) {
    return char.length === 1 && char.match(/[+=*,;(){}&]/i);
}

function isDigit(char) {
    return char.length === 1 && char.match(/\d/);
}

function isKeyword(string) {
    for (let c = 0; c < string.length; ++c) {
        let char = string[c];
        if (!isKeywordChar(char)) return false;
        if (c === 0 && !isLetter(char)) return false; 
    } 
    return true;
}

// --- LEXER ---

// tokenize keywords
function lexKeyword(string) {
    let keywordToken = "";

    // continue checking for a keyword if the first character is a letter
    if (!isLetter(string[0])) return;

    // add characters to the keyword until a non keyword character is found
    for (let c = 0; c < string.length; ++c) {
        let char = string[c];
        if (!isKeywordChar(char)) {
            return {
                tokens: keywordToken,
                string: string.substring(c)
            };
        }
        keywordToken += char;
    }
}

// tokenize operators
function lexOperator(string) {
    // return the first character if it is an operator
    if (!isOperator(string[0])) return;

    return {
        tokens: string[0],
        string: string.substring(1)
    };
}


// tokenize numbers
function lexNumber(string) {
    let numberToken = "";

    // if the first character a number, continue checking
    if (!isDigit(string[0])) return;

    // add digits to the number until a non-numeric character is found
    for (let c = 0; c < string.length; ++c) {
        let char = string[c];
        if (!isDigit(char)) {
            return {
                tokens: Number.parseInt(numberToken),
                string: string.substring(c)
            };
        }
        numberToken += char;
    }
}

// tokenize strings
function lexString(string) {
    let stringToken = "";

    // if the first character is a quote, continue checking
    if (!isQuote(string[0])) return;

    // ignoring the initial quote, keep checking until a closing quote is found
    for (let c = 1; c < string.length; ++c) {
        let char = string[c];
        if (isQuote(char)) {
            return {
                tokens: stringToken,
                string: string.substring(c + 1)
            };
        }
        stringToken += char;
    }

    throw new Error("Unclosed quotation mark.");
}

// tokenize inner text
function lexInnerText(string) {
    let innerTextToken = "";

    // interpret the rest of the statement as innertext when a colon is found
    if (string[0] !== ":") return;
    // remove colon
    string = string.substring(1); 

    for (let c = 1; c < string.length; ++c) {
        let char = string[c];
        // ignore the first newline of innertext
        if (c === 1 && char === "\n") continue;
        if (char === ";") {
            return {
                tokens: [":", innerTextToken],
                string: string.substring(c)
            };
        }
        innerTextToken += char;
    }
}

// tokenize jorp file
function lex(string) {
    let tokens = [];

    while (string.length > 0) {
        let lexResult;
        let continueFlag = false;

        let subLexers = [
            lexKeyword, 
            lexOperator, 
            lexNumber, 
            lexString, 
            lexInnerText
        ];

        // loop through every sublexer
        for (let subLexer of subLexers) {
            lexResult = subLexer(string);
            // if the sublexer returned something, update the tokens and remaining string
            if (lexResult) {
                tokens = tokens.concat(lexResult.tokens);
                string = lexResult.string;
                continueFlag = true;
                break;
            }
        }
        if (continueFlag) continue;

        // ignore whitespace characters
        if (string[0].match(/\s/)) {
            string = string.substring(1);
        }
        // ignore single line comments
        else if (string.slice(0, 2) === "//") {
            string = string.slice(string.indexOf("\n"));
        }  
        // ignore multiline comments
        else if (string.slice(0, 2) === "/*") {
            string = string.slice(string.indexOf("*/") + 2);
        }
        else {
            throw new Error("Unrecognized symbol '" + string[0] + "' detected.");
        }
    }
    
    return tokens;
}

// --- PARSER ---

function parseFunctionArgs(tokens, func) {
    // add argument list to function if it doesn't already exist
    func.args ??= [];

    // this function has no parameters
    if (tokens[0] !== "(") return {tokens: tokens};
    tokens = tokens.slice(1);

    while (tokens[0] !== ")") {
        let token = tokens[0];
        // commas aren't technically required for function parameters
        if (token === ",")  {
            tokens = tokens.slice(1);
            continue;
        }
        func.args.push(token);
        tokens = tokens.slice(1);
    }

    tokens = tokens.slice(1);

    return {
        tokens: tokens
    };
}

// parses attributes and adds them to an object as a property
function parseAttributes(tokens, object) {
    let functions = [];
    while (tokens[0] !== ";" && tokens[0] !== "{") {
        let token = tokens[0];

        // append attribute
        if (tokens[1] === "+") {
            if (tokens[2] !== "=")
                throw new Error("Expected in place addition");

            // TODO: create a method to convert to kebab case
            if (token === "class") token = "classList";

            let attribute = object[token];
            if (!(attribute instanceof DOMTokenList))
                throw new Error("In-place addition operator used on invalid attribute type");
            
            for (let className of tokens[3].split(" ")) {
                attribute.add(className);
            }
            tokens = tokens.slice(3);
        }

        // set attribute
        if (tokens[1] === "=") {
            if (!isKeyword(token))
                throw new Error("Invalid attribute name being set.");
            object[token] = tokens[2];
            tokens = tokens.slice(3);
        }

        // add following literal text
        else if (token === ":") {
            object.innerText = tokens[1];
            tokens = tokens.slice(2);
        }

        // push functions to functions array
        else {
            if (!isKeyword(token))
                throw new Error("Invalid function name found.");
            let func = {};
            func.name = token;
            tokens = tokens.slice(1);

            let parseResult = parseFunctionArgs(tokens, func);
            functions.push(func);
            tokens = parseResult.tokens;
        }
    }

    return {
        tokens: tokens,
        functions: functions
    }
}

// parse and create a vertical or horizontal flex box with empty children div
function parseFlex(tokens) {
    let token = tokens[0];
    let isVertical = null;
    // create flex element
    let element = document.createElement("div");
    element.classList.add("flex");

    // set flex to be either vertical or horizontal
    if (token === "vertical-flex") {
        element.classList.add("vertical");
        isVertical = true;
    }

    if (token === "horizontal-flex") {
        element.classList.add("horizontal");
        isVertical = false;
    }

    // set relative children sizes
    let childSizeRatios = [0];
    for (let i = 1; i < tokens.length; ++i) {
        token = tokens[i];
        if (token === "*")
            childSizeRatios[childSizeRatios.length - 1]++;
        else if (!isNaN(token)) 
            childSizeRatios[childSizeRatios.length - 1] += token;
        else if (token === ",")
            childSizeRatios.push(0);
        else {
            tokens = tokens.slice(i);
            break;
        }
    }

    if (childSizeRatios.includes(0)) {
        throw new Error("Flexbox missing relative child size.");
    }

    // calculate child sizes in percentage
    let totalChildrenSize = childSizeRatios.reduce(
        (accumulator, curr) => accumulator + curr, 0
    );

    // add empty div children to flex with correct size ratios
    for (let childSizeRatio of childSizeRatios) {
        // create child and adjust sizes
        let child = document.createElement("div");
        let childSize = (childSizeRatio / totalChildrenSize * 100).toString() + "%";
        child.style[isVertical ? "height" : "width"] = childSize;
        child.style[isVertical ? "width" : "height"] = "100%";
        // add class named empty to child
        child.classList.add("empty");
        // add child to flexbox
        element.appendChild(child);
    }

    return {
        element: element,
        tokens: tokens
    }
}

// creates an element using tag name and attributes
function parseElement(tokens) {
    let token = tokens[0];
    let element = null;

    // create an element based on the tag name provided
    if (token === "horizontal-flex" || token === "vertical-flex") {
        // create a flex box if the tag name is horizontal of vertical flex
        let parseResult = parseFlex(tokens);
        tokens = parseResult.tokens;
        element = parseResult.element;
    }
    else  {
        // create an ordinary html element otherwise
        element = document.createElement(token);
        tokens = tokens.slice(1);
    }
    // parse attributes and add them to the element
    let parseResult = parseAttributes(tokens, element);
    tokens = parseResult.tokens;

    return {
        element: element,
        tokens: tokens
    }
}

// parse animation block
function parseAnim(tokens) {
    let animation = [];
    let parseResult = parseAttributes(tokens.slice(1), animation);
    tokens = parseResult.tokens;
    return {
        tokens: tokens,
        animation: animation
    }
}

function parseFrame(tokens, frames) {
    let frame = { actions: [] };
    let actions = null;

    let parseResult = parseAttributes(tokens.slice(1), frame);
    tokens = parseResult.tokens;
    if (tokens[0] !== "{") 
        throw new Error("Anim properties should be followed by block '{}'");

    // remove opening brace
    tokens = tokens.slice(1);

    while (tokens[0] !== "}") {
        let token = tokens[0];

        if (token === ";") {
            // add the accumulated list of actions to the frame and
            frame.actions = frame.actions.concat(structuredClone(actions));
            actions = null;
            tokens = tokens.slice(1);
        }

        else if (token === "frame") {
            if (actions)
                throw new Error("Missing semicolon between frame actions");
            // read and add properties of frame to a new object
            let frameId = {};
            let parseResult = parseAttributes(tokens, frameId);
            if (!frameId?.id)
                throw new Error("Frame action missing reference id");
            // check existing frames for a matching id
            let referencedFrame = frames.find((x) => x.id === frameId.id);
            // add the actions from the referenced frame to the list of actions
            actions = [].concat(referencedFrame.actions);
            tokens = parseResult.tokens;
        }

        else {
            if (actions)
                throw new Error("Missing semicolon between frame actions");
            actions = {};
            let parseResult = parseAttributes(tokens, actions);
            actions.functions = parseResult.functions;
            tokens = parseResult.tokens;
        }
    }
    // remove closing brace
    tokens = tokens.slice(1);

    return {
        tokens: tokens,
        frame: frame
    }
}

function parseSlideContainer(tokens) {
    let attributes = {};
    let parseResult = parseAttributes(tokens, attributes);
    tokens = parseResult.tokens;
    if (!attributes?.id)
        throw new Error("Slide container declaration missing id");
    let element = document.getElementById(attributes.id);
    if (!element)
        throw new Error("Slide container reference id is invalid");
    for (let attribute in attributes) {
        element[attribute] = attributes[attribute];
    }
    return {
        tokens: tokens,
        element: element
    }
}

// parse jorp tokens into a root element for slides and an animation
function parse(tokens, rootElement = null, parentElement = null, animation = [], frames = []) {
    parentElement ??= rootElement;
    let latestElement = null;
    let selectedElement = null;
    let relativeFlag = false;
    while (tokens.length > 0) {
        let token = tokens[0];

        // token is a number
        if(!isNaN(token)) {
            if ((parentElement?.children?.length ?? 0) < token)
                throw new Error("Address number out of parent's bounds");
            // set selected element to the specified child
            selectedElement = parentElement.children[token];
            tokens = tokens.slice(1);
        }

        else if (token === "&") {
            relativeFlag = true;
            tokens = tokens.slice(1);
        }

        // start of block, parse the contents and update the tokens
        else if (token === "{") {
            let parseResult = parse(
                tokens.slice(1), 
                rootElement, 
                latestElement, 
                animation,
                frames
            );
            tokens = parseResult.tokens;
            animation = parseResult.animation;
        }

        // end of block, return left over tokens back to caller
        else if (token === "}") {
            return {
                tokens: tokens.slice(1),
                animation: animation
            };
        }

        // end of statement
        else if (token === ";") {
            // reset selected element
            selectedElement = null;
            tokens = tokens.slice(1);
            relativeFlag = false;
        }

        // parse slide container
        else if (token === "slide-container") {
            let parseResult = parseSlideContainer(tokens);
            tokens = parseResult.tokens;
            if (rootElement)
                throw new Error("Slide container already declared");
            rootElement = parseResult.element;
            parentElement ??= rootElement;
        }

        // parse animation block
        else if (token === "anim") {
            let parseResult = parseAnim(tokens);
            tokens = parseResult.tokens;
            animation = parseResult.animation;
            latestElement = "anim";
        }

        else if (token === "frame") {
            let parseResult = parseFrame(tokens, frames);
            tokens = parseResult.tokens;
            if (parentElement === "anim") {
                animation.push(parseResult.frame);
            }
            frames.push(parseResult.frame);
        }

        // create a new element and add it to the slide structure
        else if (isKeyword(token)) {
            // create the element and set the latest element to it
            let parseResult = parseElement(tokens);
            tokens = parseResult.tokens;
            latestElement = parseResult.element;

            if (relativeFlag) {
                latestElement.style.position = "relative";
                parentElement.appendChild(latestElement);
                continue;
            }
            
            // inherit size from the selected element if it exists, otherwise set to 100%
            let sizeElement = selectedElement ?? { style: {width: "100%", height: "100%"} };

            // if an element has been selected, replace the selected element
            if (selectedElement) {
                if (!selectedElement.classList.contains("empty"))
                    throw new Error("Element already exists at address number");
                selectedElement.replaceWith(latestElement);
            }
            // otherwise, append the element to the current parent 
            else {
                latestElement.style.gridColumn = "1";
                latestElement.style.gridRow = "1";

                parentElement.style.display = "grid";
                
                latestElement.style.overflow = "hidden";

                parentElement.appendChild(latestElement);
            }

            // set size to match selected element or if it doesn't exist
            latestElement.style.width = sizeElement.style.width;
            latestElement.style.height = sizeElement.style.height;
        }
        
        else { 
            throw new Error("Unrecognized token '" + token.toString() + "'");
        }
    }

    return {
        rootElement: rootElement,
        animation: animation
    }
}

function executeElementAnimationFunction(element, func) {
    window[func.name](element, func.args);
}

let currentFrame = null;
let slideObject = null;

function setAnimationState(initialFrame) {
    let animation = slideObject.animation;
    if (!isNaN(initialFrame))
        currentFrame = initialFrame;
    else
        currentFrame = animation.findIndex((frame) => frame.id === initialFrame);

    if (currentFrame < 0)
        throw new Error("Invalid value provided for initial frame");
    
    for (let i = 0; i <= currentFrame; ++i) {
        let frame = animation[i];
        for (let action of frame.actions) {
            let targetElement = document.getElementById(action.id);
            for (let func of action.functions)
                executeElementAnimationFunction(targetElement, func);
        }
    }
}

function incrementAnimationState() {
    let animation = slideObject.animation;
    ++currentFrame;

    let frame = animation[currentFrame];
    for (let action of frame.actions) {
        let targetElement = document.getElementById(action.id);
        for (let func of action.functions)
            executeElementAnimationFunction(targetElement, func);
    }
}

function createSlide(fileData) {
    handleFileData(fileData);

    // lex file contents
    let tokens = lex(fileData);
    
    // parse slide object using tokens
    slideObject = parse(tokens);

    document.addEventListener("keydown", (e) => {
        if (e.key !== "c") return;
        incrementAnimationState();
    })

    document.addEventListener("touchstart", (e) => {
        //if (e.key !== "c") return;
        incrementAnimationState();
    })

    setAnimationState(slideObject.animation["initial-frame"] ?? 0);

    getFile("calc/style.css", importStyleSheet);   
}

function importModule(filePath) {
    let scriptElement = document.createElement("script");
    document.body.appendChild(scriptElement);
    scriptElement.type = "module";
    scriptElement.src = filePath;
}

function importStyleSheet(fileData) {
    handleFileData(fileData);
    
    // get id from root element
    if (!slideObject)
        throw new Error("Unable to import stylesheet before slide constructed");
    let rootElement = slideObject.rootElement;
    let id = rootElement.id;
    if (!id)
        throw new Error("Unable to import stylesheet as slide root node is missing id");

    // prepend id to all css classes and add it to a style element
    let regex = /([,|\}][\s$]*)([\.#]?-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g
    fileData = fileData.replaceAll(regex, "$1#" + id + " $2");
    let style = document.createElement("style");
    style.textContent = fileData;

    // append the style element to the root element
    rootElement.appendChild(style);
}

function handleFileData(fileData) {
    if (!fileData)
        throw new Error("Get file call failed");
}

function getFile(path, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            // request is done
            if (request.status == 200) {
                callback(request.responseText);
            }
            else {
                callback(null);
            }
        }
    }
    request.open("GET", path);
    request.send();
}

/*
function atVar(hello) {
    return new DataView(hello.buffer).getUint32(0);
}

function jorpParsingSoHardRightNowButInKebabCase(pointing) {
    return (new TextEncoder()).encode(pointing); 
}

function seeSharp(beeSharp) {
    return (new TextDecoder()).decode(beeSharp);
}

function what() {
    const uhOhIDontKnow = document.createElement("input");
    uhOhIDontKnow.type = "file";
    
    const amongUs = uhOhIDontKnow.getFile();
    console.log(amongUs);

    const no = amongUs.arrayBuffer();
}

function superSecretClassifiedFunction(superSecretClassifiedParameter) {
    // i added this for fun but it i probably cant finish this before the round is over so ignore this for now ill finish it eventually thank you for your time and patience 
    // "what does this do" - joseph
    // it will do some super funny jorping you will be jorping all over the place

    const bumble = jorpParsingSoHardRightNowButInKebabCase("JORPjorp")

    // if (superSecretClassifiedParameter.slice(0, 8) !== bumble) {
    //     // i have no clue how to do asserts in javascript deal with this for now
    //     throw new Error("you're not very jorpful...")
    // }

    console.log(superSecretClassifiedParameter.slice(0, 16));
    for (let char of superSecretClassifiedParameter.slice(0, 16)) {
        console.log(char.toString(16));
    }
    console.log(seeSharp(superSecretClassifiedParameter.slice(0, 16)));

    for (let i = 8; i < superSecretClassifiedParameter.byteLength; ) {
        let lopsidedExcitedNarwhal = atVar(superSecretClassifiedParameter.slice(i, i+4));
        i += 4;

        let trueYappingPenguin = seeSharp(superSecretClassifiedParameter.slice(i, i+4));
        i += 4;

        let dancingAdamTravelling = superSecretClassifiedParameter.slice(i, i+lopsidedExcitedNarwhal);
        i += lopsidedExcitedNarwhal;
        
        let completeReachCompetition = superSecretClassifiedParameter.slice(i, i+4);
        i += 4;

    }
}
*/

document.addEventListener("DOMContentLoaded", () => {
    importModule("jorp-events.js");
});

document.addEventListener("keydown", (e) => {
    if (e.key === "q") window.MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    if (e.key !== "v") return;
    getFile("calc/slide.jorp", createSlide);
})