import { Lang, Interpreter } from "./constant";
import { getCodeBlock } from "./textNormalization";

interface PromptEngineering {
    
  /**
   * Returns a function that translates the given text from the specified source language to the target language.
   * @param {string} from The source language.
   * @param {string} to The target language.
   * @returns {(text: string) => string} A function that takes a string input and returns the translated string.
   */
  translate: (from: Lang, to: Lang) => (text: string) => string;

  /**
   * Returns a function that formats the given input data into the specified JSON schema.
   * @param {object} schema The JSON schema to format the data into.
   * @returns {(description: string, input: object) => string} A function that takes an input object and returns the formatted JSON string.
   */
  formatJson: (schema: Record<string, unknown>) => (description: string, input: object) => string;

  /**
   * Returns a function that formats the given input data according to the specified format string.
   * @param {string format The format string to use for formatting the input data.
   * @returns {(description: string) => string} A function that takes an description and returns the formatted string.
   */
  formatFree: (format: string) => (description: string) => string;

  /**
   * Returns a function that uses an external interpreter to answer the given question.
   * @param {Interpreter} interpreter The name or path of the external interpreter to use.
   * @returns {(question: string) => string} A function that takes a question string and returns the interpreter's answer.
   */
  useInterpreter: (interpreter: Interpreter) => (question: string) => string;
}

class PromptCraft implements PromptEngineering {
    // prompt method, pass when construct
    private prompt: (text: string) => string;
    private getCodeBlock: (text: string) => string | null;
    public sessionId: string | null = null;

    constructor(prompt: (text: string) => string, getCodeBlock: (text: string) => string | null) {
        this.prompt = prompt;
        this.getCodeBlock = getCodeBlock;
    }

    // translate method
    translate(from: Lang, to: Lang): (text: string) => string {
        return (text: string) => {
            return this.prompt(`A ${from} phrase is provided: ${text}
            The masterful ${from} translator flawlessly translates the phrase into ${to}:`);
        };
    }

    // formatJson method
    formatJson(schema: Record<string, unknown>): (description: string, input: object) => string {
        return (description: string, input: object) => {
            const promptResult = this.prompt(`
            ${description}\n
            Use JSON format, add \`\`\` at the start and end of json:\n
            ${Object.keys(schema).map(key => `${key}: ${schema[key]}`).join('\n            // ')}

            input = ${JSON.stringify(input, null, 4)}
        `);

        const codeBlock = this.getCodeBlock(promptResult);

        if(codeBlock) {
            return JSON.parse(codeBlock);
        }

        return promptResult;
        };
    }

    // formatFree method
    formatFree(schema: string): (description: string) => string {
        return (description: string) => {
            const promptResult = this.prompt(`
            ${description}\n
            Use this format, add \`\`\` at the start and end of content:\n
            ${schema}
        `);

        return this.getCodeBlock(promptResult) ?? promptResult;
        };
    }

    // useInterpreter method
    useInterpreter(interpreter: Interpreter, runCode?: boolean): (question: string) => string {
        return (question: string) => {
            const promptResult = this.prompt(`
            Write an ${interpreter} program to answer the following question,\n
            use this format:\n
            \`\`\`
            <${interpreter} commands and output needed to find answer>
            \`\`\`\n
            Only return the program code, don't return the explanation.\n
            Begin.\n
            ${question}
            `);

            const codeBlock = this.getCodeBlock(promptResult);

            if(runCode && codeBlock) {
                return eval(codeBlock);
            }

            if(codeBlock) {
                return codeBlock;
            }

            return promptResult;
        };
    }
}

export default PromptCraft;
