import Groq from "groq-sdk";


const groq = new Groq({

    apiKey:
        process.env.GROQ_API_KEY

});


const MODEL_NAME =
    "openai/gpt-oss-120b";


const MAX_HISTORY_MESSAGES = 20;

const MAX_MESSAGE_LENGTH = 4000;


const SYSTEM_PROMPT = `
You are Resora, an AI research assistant designed to help
undergraduate students explore research topics and questions.

Your main areas include:

- Natural Language Processing
- Machine Learning
- Artificial Intelligence
- Deep Learning
- Research methodology
- Academic research planning
- Research ideas
- Dataset selection
- Model selection
- Evaluation methods

Your responsibilities:

1. Explain concepts clearly and accurately.
2. Maintain context across the conversation.
3. Suggest research directions when appropriate.
4. Suggest methodologies when appropriate.
5. Suggest datasets, models, and evaluation metrics when relevant.
6. Mention limitations and challenges.
7. Use headings, bullet lists, numbered lists, tables,
   and code blocks when they improve clarity.

Important academic rules:

- Never fabricate research papers.
- Never fabricate authors.
- Never fabricate citations.
- Never fabricate datasets.
- Never fabricate statistics.
- Never fabricate experimental results.
- Do not claim to have searched academic databases unless
  an actual search tool was used.
- Tell the user to verify academic claims using reliable
  scholarly sources.

When the user asks a follow-up question, use previous
conversation context to understand references such as
"it", "this", "that method", "the dataset", or "the model".

Your goal is to act as a useful research companion.
`;


export async function POST(request) {

    try {

        // =====================================================
        // READ REQUEST
        // =====================================================

        const body =
            await request.json();


        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";


        const history =
            Array.isArray(body.history)
                ? body.history
                : [];


        // =====================================================
        // VALIDATION
        // =====================================================

        if (!message) {

            return Response.json(
                {
                    error:
                        "Please enter a research question."
                },
                {
                    status: 400
                }
            );
        }


        if (
            message.length >
            MAX_MESSAGE_LENGTH
        ) {

            return Response.json(
                {
                    error:
                        "Your message is too long."
                },
                {
                    status: 400
                }
            );
        }


        // =====================================================
        // CLEAN HISTORY
        // =====================================================

        const safeHistory =
            history
                .filter(
                    (item) =>
                        item &&
                        (
                            item.role === "user" ||
                            item.role === "assistant"
                        ) &&
                        typeof item.content === "string" &&
                        item.content.trim()
                )
                .slice(
                    -MAX_HISTORY_MESSAGES
                )
                .map(
                    (item) => ({

                        role:
                            item.role,

                        content:
                            item.content
                                .trim()
                                .slice(
                                    0,
                                    MAX_MESSAGE_LENGTH
                                )

                    })
                );


        // =====================================================
        // BUILD GROQ MESSAGES
        // =====================================================

        const messages = [

            {
                role:
                    "system",

                content:
                    SYSTEM_PROMPT
            },

            ...safeHistory,

            {
                role:
                    "user",

                content:
                    message
            }

        ];


        console.log(
            "Resora: sending request to Groq..."
        );


        // =====================================================
        // GROQ STREAM
        // =====================================================

        const stream =
            await groq.chat.completions.create({

                model:
                    MODEL_NAME,

                messages:
                    messages,

                temperature:
                    0.3,

                max_completion_tokens:
                    2048,

                stream:
                    true

            });


        console.log(
            "Resora: stream started."
        );


        // =====================================================
        // SSE STREAM
        // =====================================================

        const encoder =
            new TextEncoder();


        const readableStream =
            new ReadableStream({

                async start(controller) {

                    try {

                        for await (
                            const chunk
                            of stream
                        ) {

                            const content =
                                chunk
                                    .choices?.[0]
                                    ?.delta
                                    ?.content;


                            if (!content) {
                                continue;
                            }


                            controller.enqueue(

                                encoder.encode(

                                    `data: ${JSON.stringify({
                                        content
                                    })}\n\n`

                                )

                            );
                        }


                        controller.enqueue(

                            encoder.encode(

                                `data: ${JSON.stringify({
                                    done: true
                                })}\n\n`

                            )

                        );


                        controller.close();


                    } catch (error) {

                        console.error(
                            "Groq stream error:",
                            error
                        );


                        controller.enqueue(

                            encoder.encode(

                                `data: ${JSON.stringify({
                                    error:
                                        "Resora could not complete the response."
                                })}\n\n`

                            )
                        );


                        controller.close();
                    }
                }
            });


        return new Response(
            readableStream,
            {

                status: 200,

                headers: {

                    "Content-Type":
                        "text/event-stream",

                    "Cache-Control":
                        "no-cache, no-transform",

                    "Connection":
                        "keep-alive"

                }

            }
        );


    } catch (error) {

        console.error(
            "Resora API error:",
            error
        );


        return Response.json(
            {
                error:
                    "Unable to connect to the Resora AI service."
            },
            {
                status: 500
            }
        );
    }
}