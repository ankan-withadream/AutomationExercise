// File: server.js
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;

// Function to traverse directory and find .java files
function getJavaFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getJavaFiles(filePath, fileList);
        } else if (filePath.endsWith('.java')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

// Function to extract package, class, and objects from Java files
function parseJavaFile(filePath) {
    console.log("Parsing java file: " + filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const result = {
        package: null,
        classes: [],
        public: [],
        private: []
    };

    // Extract package
    const packageMatch = fileContent.match(/package\s+([\w.]+);/);
    // console.log("Package match: " + JSON.stringify(packageMatch));
    if (packageMatch) result.package = packageMatch[1];

    // Extract classes
    const classMatches = [...fileContent.matchAll(/class\s+(\w+)/g)];
    classMatches.forEach((match) => result.classes.push(match[1]));

    // Extract public methods, variables, and elements
    const publicMatches = [...fileContent.matchAll(/public\s+(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(?:synchronized\s+)?(?:transient\s+)?(?:volatile\s+)?(?:\w+\s+)?(\w+)/g)];
    result.public = publicMatches.map((match) => match[1]);

    // Extract private methods, variables, and elements
    const privateMatches = [...fileContent.matchAll(/private\s+(?:static\s+)?(?:abstract\s+)?(?:final\s+)?(?:synchronized\s+)?(?:transient\s+)?(?:volatile\s+)?(?:\w+\s+)?(\w+)/g)];
    result.private = privateMatches.map((match) => match[1]);

    return result;
}

// Build JSON structure from Java project
function buildProjectStructure(baseDir) {
    const javaFiles = getJavaFiles(baseDir);
    const projectStructure = {};
    javaFiles.forEach((file) => {
        const parsedData = parseJavaFile(file);
        console.log("Parsed data: " + JSON.stringify(parsedData));
        if (parsedData.package) {
            if (!projectStructure[parsedData.package]) {
                projectStructure[parsedData.package] = {
                    classes: [],
                    public: [],
                    private: []
                };
                // projectStructure[parsedData.package] = [];
            }
            projectStructure[parsedData.package].classes.push(...parsedData.classes);
            projectStructure[parsedData.package].public.push(...parsedData.public);
            projectStructure[parsedData.package].private.push(...parsedData.private);
            // projectStructure[parsedData.package].push(...parsedData.classes);
        }
    });

    return projectStructure;
}

// API endpoint
app.get('/project-structure', (req, res) => {
    // const javaProjectPath = path.resolve(__dirname, "'java_project'"); // Change this to your Java project folder
    const javaProjectPath = path.resolve('/workspaces/AutomationExercise/src/test/java/com/automationexercise/pages/');
    if (!fs.existsSync(javaProjectPath)) {
        return res.status(404).json({ error: 'Java project folder not found' });
    }

    const structure = buildProjectStructure(javaProjectPath);
    res.json(structure);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
