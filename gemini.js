const
{ 
    GoogleGenAI, 
    Type
} = require("@google/genai");

const ai = new GoogleGenAI(
{
    apiKey: process.env.GEMINI_API_KEY
});

const instruction = `
### **YOUR ROLE**
You are a specialist AI tasked with designing advanced-level exam questions. Your primary focus is to create questions that test conceptual understanding, analytical skills, and problem-solving abilities, rather than mere rote memorization.

### **PRIMARY TASK**
Based on the parameters below, generate **tricky and deceptive multiple-choice questions**.

- **Language:** {0}
- **Course:** {1}
- **Specific Topic:** {2}

### **QUESTION GENERATION RULES**
1. **Difficulty Level (Expert):** The target audience for these questions are advanced students with a deep understanding of the subject, equivalent to a research assistant for a PhD-level professor. The questions must compel them to think critically and analytically.
2. **Reference Material Analysis:** You are provided with a list of reference questions below.
    - **Your Task:** Analyze these questions to understand the style, depth, and types of concepts being tested.
    - **Strict Prohibition:** **DO NOT COPY, PLAGIARIZE, OR MODIFY THE REFERENCE QUESTIONS.** You must create **entirely new** questions with significantly greater creativity, complexity, and deceptive elements.
3. **Answer Choice Design:**
    - Each question must have one single, best answer.
    - The incorrect answer choices (distractors) must be designed to be highly plausible. Utilize common misconceptions, subtle logical fallacies, or nearly correct interpretations of data to create effective traps.
4. **Question Focus:** Prioritize creating scenario-based, case study, or data analysis questions (where applicable) that force students to **apply** theory, not just recall it.
5. **Output Formatting:** Use the available Markdown and Math LaTeX (if needed) to write the questions, answer choices, and explaination in a clear and structured format.

### **REFERENCE QUESTIONS FROM THE PROFESSOR (FOR INSPIRATION ONLY)**
{3}

### **OUTPUT INSTRUCTION**
- CHOICES SHOULD NOT includes letter list. Just write down the choice text. Each question must consists at least 5 choices.
- Single-line LaTeX should starts and ends with $. Meanwhile multiline LaTeX should starts and ends with $$.
- Make explaination easy to read by writing it in markdown and Math LaTeX (if needed).
\`\`\`
`;

const prompt = `Create 10 questions.`;

/**
 * Get quiz drills from Gemini
 * @param { string } language Code of language 
 * @param { string } course Name of course 
 * @param { string } topic Name of topic 
 * @param { Array<string> } problems List of problems from topic 
 * @returns { Promise<{
 *      status: number,
 *      data: string
 * }>}
 */
function Send(language, course, topic, problems, occurence = 1)
{
    return new Promise(async function(resolve)
    {
        try
        {
            try
            {
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            required: ["problems"],
                            properties: {
                                problems: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    required: ["question", "choices"],
                                    properties: {
                                    question: {
                                        type: Type.STRING,
                                    },
                                    choices: {
                                        type: Type.ARRAY,
                                        items: {
                                        type: Type.OBJECT,
                                        required: ["text", "correct", "explaination"],
                                        properties: {
                                            text: {
                                            type: Type.STRING,
                                            },
                                            correct: {
                                            type: Type.BOOLEAN,
                                            },
                                            explaination: {
                                            type: Type.STRING,
                                            },
                                        },
                                        },
                                    },
                                    },
                                },
                                },
                            },
                        },
                        systemInstruction: 
                        [
                            { 
                                text: instruction
                                        .replace("{0}", language) 
                                        .replace("{1}", course) 
                                        .replace("{2}", topic) 
                                        .replace("{3}", "- " + problems.join("\n- ")) 
                            }
                        ],
                    },
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: prompt }]
                        },
                    ]
                });
                
                return resolve({
                    status: 200,
                    data: response.text
                });
            }
            catch (error)
            {
                if (error?.status == 429 || (error?.status / 100 | 0 == 5) || error?.message.includes("fetch failed"))
                {
                    if (occurence > 5)
                        throw error;
    
                    setTimeout(async function()
                    {
                        resolve(await Send(language, course, topic, problems, occurence + 1));
                    })
                }
                else
                {
                    throw error;
                }
            }
        }
        catch (error)
        {
            console.error(error);
            return resolve({
                status: error.status || 0,
                data: "[]"
            });
        }
    });
}

module.exports = { Send };