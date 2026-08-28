import "./globals.css";


export const metadata = {

    title:
        "Resora | AI Research Assistant",

    description:
        "LLM-powered research assistant for students."

};


export default function RootLayout({
    children
}) {

    return (

        <html lang="en">

            <body>
                {children}
            </body>

        </html>
    );
}