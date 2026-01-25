import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');
const rootFiles = ['index.js'];

function removeComments(code) {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';
    let inTemplateString = false;
    
    while (i < code.length) {
        // Handle template strings
        if (code[i] === '`' && !inString) {
            if (inTemplateString) {
                inTemplateString = false;
            } else {
                inTemplateString = true;
            }
            result += code[i];
            i++;
            continue;
        }
        
        // Handle regular strings
        if ((code[i] === '"' || code[i] === "'") && !inTemplateString) {
            if (!inString) {
                inString = true;
                stringChar = code[i];
            } else if (code[i] === stringChar && code[i-1] !== '\\') {
                inString = false;
            }
            result += code[i];
            i++;
            continue;
        }
        
        // Skip comments only when not in a string
        if (!inString && !inTemplateString) {
            // Single line comment
            if (code[i] === '/' && code[i+1] === '/') {
                // Skip until end of line
                while (i < code.length && code[i] !== '\n') {
                    i++;
                }
                // Keep the newline
                if (code[i] === '\n') {
                    result += '\n';
                    i++;
                }
                continue;
            }
            
            // Multi-line comment
            if (code[i] === '/' && code[i+1] === '*') {
                i += 2;
                // Skip until end of comment
                while (i < code.length && !(code[i] === '*' && code[i+1] === '/')) {
                    // Preserve newlines for line counting
                    if (code[i] === '\n') {
                        result += '\n';
                    }
                    i++;
                }
                i += 2; // Skip */
                continue;
            }
        }
        
        result += code[i];
        i++;
    }
    
    // Clean up multiple empty lines
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove trailing whitespace from lines
    result = result.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Ensure file ends with single newline
    result = result.trimEnd() + '\n';
    
    return result;
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleaned = removeComments(content);
        fs.writeFileSync(filePath, cleaned, 'utf8');
        console.log(`✓ ${path.relative(process.cwd(), filePath)}`);
    } catch (err) {
        console.error(`✗ ${filePath}: ${err.message}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.js')) {
            processFile(filePath);
        }
    }
}

console.log('Removing comments from JavaScript files...\n');

// Process src directory
walkDir(srcDir);

// Process root JS files
for (const file of rootFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        processFile(filePath);
    }
}

console.log('\n✅ Done! Comments removed from all JavaScript files.');
