// File: parse-java.js
import fs from 'fs';
import path from 'path';
import antlr4 from 'antlr4';
import JavaLexer from './antlr/JavaLexer.js'; // Generated lexer
import JavaParser from './antlr/JavaParser.js'; // Generated parser
import JavaParserListener from './antlr/JavaParserListener.js'; // Generated listener

// Function to list all Java files in a folder
function listJavaFiles(folderPath) {
    const files = [];
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(folderPath, item.name);
        if (item.isDirectory()) {
            files.push(...listJavaFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.java')) {
            files.push(fullPath);
        }
    }
    return files;
}

// Custom listener to extract classes, methods, and variables
class JavaStructureListener extends JavaParserListener {
    constructor() {
        super();
        this.structure = {
            classes: [],
        };
        this.currentClass = null;
    }

    enterClassDeclaration(ctx) {
        // ctx.children.forEach((child, index) => {
        //     console.log(`Child ${index}:`, child.getText());
        // });
        
        const className = ctx.identifier().getText();
        this.currentClass = { name: className, methods: [], variables: [] };
        this.structure.classes.push(this.currentClass);
    }

    exitClassDeclaration() {
        this.currentClass = null;
    }

    enterMethodDeclaration(ctx) {
        const methodName = ctx.identifier().getText();
        if (this.currentClass) {
            this.currentClass.methods.push(methodName);
        }
    }

    enterFieldDeclaration(ctx) {
        const variableNames = ctx.variableDeclarators().variableDeclarator().map((varCtx) =>
            varCtx.variableDeclaratorId().identifier().getText()
        );
        if (this.currentClass) {
            this.currentClass.variables.push(...variableNames);
        }
    }
}

// Function to parse a single Java file
function parseJavaFile(filePath) {
    const input = fs.readFileSync(filePath, 'utf-8');
    const chars = new antlr4.InputStream(input);
    const lexer = new JavaLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new JavaParser(tokens);
    parser.buildParseTrees = true;

    const tree = parser.compilationUnit();
    const listener = new JavaStructureListener();
    antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);

    return listener.structure;
}

// Main function to parse a package folder
function parseJavaPackage(folderPath) {
    const javaFiles = listJavaFiles(folderPath);
    const packageStructure = [];

    javaFiles.forEach((file) => {
        console.log(`Parsing: ${file}`);
        const structure = parseJavaFile(file);
        packageStructure.push({ file, structure });
    });

    return packageStructure;
}




function addMethodToClass(javaCode, className, newMethodCode) {
    const chars = new antlr4.InputStream(javaCode);
    const lexer = new JavaLexer(chars);
    const tokens = new antlr4.CommonTokenStream(lexer);
    const parser = new JavaParser(tokens);

    parser.buildParseTrees = true;
    const tree = parser.compilationUnit();

    // Find the target class
    const classNode = tree.children.find((node) =>
        node.constructor.name === 'ClassDeclarationContext' &&
        node.Identifier().getText() === className
    );

    if (!classNode) {
        throw new Error(`Class "${className}" not found.`);
    }

    // Locate the class body
    const classBody = classNode.classBody().getText();

    // Inject the new method code before the closing brace
    const updatedBody = classBody.replace(
        /}$/, // Match the closing brace
        `\n${newMethodCode}\n}`
    );

    // Replace the class body in the original code
    const updatedCode = javaCode.replace(classBody, updatedBody);
    return updatedCode;
}

// Example Usage
const inputFilePath = './TestCase1.java';
const outputFilePath = './TestCase1Modified.java';

const javaCode = fs.readFileSync(inputFilePath, 'utf-8');
const newMethod = `
    @Step("Verify new functionality")
    public void verifyNewFunctionality() {
        System.out.println("New functionality verified!");
    }
`;

try {
    const updatedCode = addMethodToClass(javaCode, 'TestCase1', newMethod);
    fs.writeFileSync(outputFilePath, updatedCode, 'utf-8');
    console.log('New method added successfully. Modified code written to', outputFilePath);
} catch (error) {
    console.error('Error:', error.message);
}

// Example Usage
// const folderPath = path.resolve('/workspaces/AutomationExercise/src/test/java/com/automationexercise/pages/');; // Replace with your Java package path
// const result = parseJavaPackage(folderPath);
// console.log(JSON.stringify(result, null, 2));

const folderPath = path.resolve('/workspaces/AutomationExercise/src/test/java/com/automationexercise/tests/');; // Replace with your Java package path
const result = parseJavaPackage(folderPath);
console.log(JSON.stringify(result, null, 2));