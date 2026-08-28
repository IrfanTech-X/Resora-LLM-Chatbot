"use client";


import {
    useEffect,
    useRef,
    useState
} from "react";


import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from "firebase/auth";


import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp
} from "firebase/firestore";


import {
    auth,
    db
} from "../lib/firebase";


import { marked } from "marked";
import DOMPurify from "dompurify";


// =========================================================
// CONSTANTS
// =========================================================

const MAX_MESSAGE_LENGTH = 4000;

const SESSION_ID = "default";


// =========================================================
// HOME
// =========================================================

export default function Home() {

    // =====================================================
    // AUTH STATE
    // =====================================================

    const [user, setUser] =
        useState(null);


    const [authLoading, setAuthLoading] =
        useState(true);


    // =====================================================
    // AUTH FORM STATE
    // =====================================================

    const [authMode, setAuthMode] =
        useState("login");


    const [email, setEmail] =
        useState("");


    const [password, setPassword] =
        useState("");


    const [authError, setAuthError] =
        useState("");


    const [authSubmitting, setAuthSubmitting] =
        useState(false);


    // =====================================================
    // CHAT STATE
    // =====================================================

    const [messages, setMessages] =
        useState([]);


    const [input, setInput] =
        useState("");


    const [loading, setLoading] =
        useState(false);


    const [historyLoading, setHistoryLoading] =
        useState(false);


    const [historyError, setHistoryError] =
        useState("");


    // =====================================================
    // UI STATE
    // =====================================================

    const [sidebarOpen, setSidebarOpen] =
        useState(false);


    // =====================================================
    // REFS
    // =====================================================

    const messagesEndRef =
        useRef(null);


    // =====================================================
    // FIREBASE AUTH LISTENER
    // =====================================================

    useEffect(() => {

        const unsubscribe =
            onAuthStateChanged(
                auth,
                (currentUser) => {

                    setUser(
                        currentUser
                    );

                    setAuthLoading(
                        false
                    );
                }
            );


        return unsubscribe;

    }, []);


    // =====================================================
    // LOAD CHAT HISTORY
    // =====================================================

    useEffect(() => {

        if (!user) {

            setMessages([]);

            return;
        }


        async function loadHistory() {

            setHistoryLoading(true);

            setHistoryError("");


            try {

                const messagesRef =
                    collection(
                        db,
                        "users",
                        user.uid,
                        "sessions",
                        SESSION_ID,
                        "messages"
                    );


                const messagesQuery =
                    query(
                        messagesRef,

                        orderBy(
                            "createdAt",
                            "asc"
                        )
                    );


                const snapshot =
                    await getDocs(
                        messagesQuery
                    );


                const loadedMessages =
                    snapshot.docs
                        .map(
                            (doc) =>
                                doc.data()
                        )
                        .filter(
                            (item) =>
                                (
                                    item.role ===
                                    "user"
                                ) ||
                                (
                                    item.role ===
                                    "assistant"
                                )
                        )
                        .map(
                            (item) => ({

                                role:
                                    item.role,

                                content:
                                    item.content || ""

                            })
                        );


                setMessages(
                    loadedMessages
                );


            } catch (error) {

                console.error(
                    "History loading error:",
                    error
                );


                /*
                 * Do NOT block the chatbot if
                 * Firestore history fails.
                 */

                setHistoryError(
                    "Previous conversation could not be loaded."
                );

            } finally {

                setHistoryLoading(
                    false
                );
            }
        }


        loadHistory();

    }, [user]);


    // =====================================================
    // AUTO SCROLL
    // =====================================================

    useEffect(() => {

        messagesEndRef
            .current
            ?.scrollIntoView({
                behavior: "smooth"
            });

    }, [messages]);


    // =====================================================
    // AUTH ERROR HANDLING
    // =====================================================

    function getAuthErrorMessage(
        error
    ) {

        switch (error.code) {

            case "auth/invalid-credential":

                return (
                    "The email or password is incorrect."
                );


            case "auth/user-not-found":

                return (
                    "No account exists with this email."
                );


            case "auth/wrong-password":

                return (
                    "The email or password is incorrect."
                );


            case "auth/email-already-in-use":

                return (
                    "An account already exists with this email."
                );


            case "auth/weak-password":

                return (
                    "Password should be at least 6 characters."
                );


            case "auth/invalid-email":

                return (
                    "Please enter a valid email address."
                );


            case "auth/popup-closed-by-user":

                return (
                    "Google sign-in was cancelled."
                );


            case "auth/popup-blocked":

                return (
                    "Your browser blocked the Google sign-in popup."
                );


            case "auth/network-request-failed":

                return (
                    "Network error. Please check your connection."
                );


            default:

                return (
                    "Authentication failed. Please try again."
                );
        }
    }


    // =====================================================
    // GOOGLE SIGN IN
    // =====================================================

    async function handleGoogleSignIn() {

        setAuthError("");

        setAuthSubmitting(true);


        try {

            const provider =
                new GoogleAuthProvider();


            await signInWithPopup(
                auth,
                provider
            );


        } catch (error) {

            console.error(
                "Google sign-in error:",
                error
            );


            setAuthError(
                getAuthErrorMessage(
                    error
                )
            );

        } finally {

            setAuthSubmitting(
                false
            );
        }
    }


    // =====================================================
    // EMAIL LOGIN / SIGNUP
    // =====================================================

    async function handleEmailAuth(
        event
    ) {

        event.preventDefault();


        const cleanEmail =
            email.trim();


        setAuthError("");


        if (!cleanEmail) {

            setAuthError(
                "Please enter your email address."
            );

            return;
        }


        if (!password) {

            setAuthError(
                "Please enter your password."
            );

            return;
        }


        setAuthSubmitting(true);


        try {

            if (
                authMode ===
                "login"
            ) {

                await signInWithEmailAndPassword(
                    auth,
                    cleanEmail,
                    password
                );

            } else {

                await createUserWithEmailAndPassword(
                    auth,
                    cleanEmail,
                    password
                );
            }


            setEmail("");

            setPassword("");


        } catch (error) {

            console.error(
                "Email auth error:",
                error
            );


            setAuthError(
                getAuthErrorMessage(
                    error
                )
            );

        } finally {

            setAuthSubmitting(
                false
            );
        }
    }


    // =====================================================
    // SIGN OUT
    // =====================================================

    async function handleSignOut() {

        try {

            await signOut(
                auth
            );


            setMessages([]);

        } catch (error) {

            console.error(
                "Sign out error:",
                error
            );
        }
    }


    // =====================================================
    // SAVE CONVERSATION
    // =====================================================

    async function saveConversation(
        uid,
        userMessage,
        assistantMessage
    ) {

        if (
            !uid ||
            !assistantMessage.trim()
        ) {

            return;
        }


        try {

            const messagesRef =
                collection(
                    db,
                    "users",
                    uid,
                    "sessions",
                    SESSION_ID,
                    "messages"
                );


            await addDoc(
                messagesRef,
                {

                    role:
                        "user",

                    content:
                        userMessage,

                    createdAt:
                        serverTimestamp()

                }
            );


            await addDoc(
                messagesRef,
                {

                    role:
                        "assistant",

                    content:
                        assistantMessage,

                    createdAt:
                        serverTimestamp()

                }
            );


        } catch (error) {

            /*
             * Chat should still work even if
             * Firestore saving fails.
             */

            console.error(
                "Firestore save error:",
                error
            );
        }
    }


    // =====================================================
    // SEND CHAT MESSAGE
    // =====================================================

    async function handleSubmit(
        event
    ) {

        event.preventDefault();


        const message =
            input.trim();


        // -------------------------------------------------
        // Validation
        // -------------------------------------------------

        if (!message) {

            return;
        }


        if (
            loading ||
            !user
        ) {

            return;
        }


        if (
            message.length >
            MAX_MESSAGE_LENGTH
        ) {

            return;
        }


        // -------------------------------------------------
        // Clear input
        // -------------------------------------------------

        setInput("");


        // -------------------------------------------------
        // Save current conversation for API
        // -------------------------------------------------

        const history =
            messages.map(
                (item) => ({

                    role:
                        item.role,

                    content:
                        item.content

                })
            );


        // -------------------------------------------------
        // Show user message
        // -------------------------------------------------

        setMessages(
            (previous) => [

                ...previous,

                {
                    role:
                        "user",

                    content:
                        message
                }

            ]
        );


        setLoading(
            true
        );


        let assistantText =
            "";


        try {

            // =================================================
            // REQUEST NEXT.JS CHAT API
            // =================================================

            const response =
                await fetch(
                    "/api/chat",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                message:
                                    message,

                                history:
                                    history

                            })

                    }
                );


            // =================================================
            // HTTP ERROR
            // =================================================

            if (
                !response.ok
            ) {

                let errorMessage =
                    "Unable to connect to Resora.";


                try {

                    const errorData =
                        await response.json();


                    if (
                        errorData.error
                    ) {

                        errorMessage =
                            errorData.error;
                    }

                } catch {
                    // Keep default message
                }


                throw new Error(
                    errorMessage
                );
            }


            // =================================================
            // VERIFY STREAM
            // =================================================

            if (
                !response.body
            ) {

                throw new Error(
                    "Resora did not return a response stream."
                );
            }


            // =================================================
            // ADD EMPTY ASSISTANT MESSAGE
            // =================================================

            setMessages(
                (previous) => [

                    ...previous,

                    {
                        role:
                            "assistant",

                        content:
                            ""
                    }

                ]
            );


            // =================================================
            // STREAM READER
            // =================================================

            const reader =
                response.body.getReader();


            const decoder =
                new TextDecoder();


            let buffer =
                "";


            // =================================================
            // READ STREAM
            // =================================================

            while (true) {

                const {
                    value,
                    done
                } =
                    await reader.read();


                if (done) {

                    break;
                }


                buffer +=
                    decoder.decode(
                        value,
                        {
                            stream:
                                true
                        }
                    );


                // -------------------------------------------------
                // Split SSE messages
                // -------------------------------------------------

                const events =
                    buffer.split(
                        "\n\n"
                    );


                buffer =
                    events.pop();


                // -------------------------------------------------
                // Process events
                // -------------------------------------------------

                for (
                    const event
                    of events
                ) {

                    const line =
                        event
                            .split("\n")
                            .find(
                                (item) =>
                                    item.startsWith(
                                        "data: "
                                    )
                            );


                    if (!line) {

                        continue;
                    }


                    const jsonText =
                        line.slice(
                            6
                        );


                    let data;


                    try {

                        data =
                            JSON.parse(
                                jsonText
                            );

                    } catch (
                        parseError
                    ) {

                        console.error(
                            "SSE JSON error:",
                            parseError
                        );

                        continue;
                    }


                    // -------------------------------------------------
                    // Server error
                    // -------------------------------------------------

                    if (
                        data.error
                    ) {

                        throw new Error(
                            data.error
                        );
                    }


                    // -------------------------------------------------
                    // Streamed text
                    // -------------------------------------------------

                    if (
                        data.content
                    ) {

                        assistantText +=
                            data.content;


                        setMessages(
                            (previous) => {

                                const updated =
                                    [
                                        ...previous
                                    ];


                                const lastIndex =
                                    updated.length -
                                    1;


                                if (
                                    updated[lastIndex]
                                        ?.role ===
                                    "assistant"
                                ) {

                                    updated[lastIndex] = {

                                        role:
                                            "assistant",

                                        content:
                                            assistantText

                                    };
                                }


                                return updated;
                            }
                        );
                    }
                }
            }


            // =================================================
            // SAVE COMPLETED CONVERSATION
            // =================================================

            if (
                assistantText.trim()
            ) {

                await saveConversation(
                    user.uid,
                    message,
                    assistantText
                );
            }


        } catch (error) {

            console.error(
                "Resora chat error:",
                error
            );


            setMessages(
                (previous) => {

                    const updated =
                        [
                            ...previous
                        ];


                    const lastIndex =
                        updated.length - 1;


                    if (
                        updated[lastIndex]
                            ?.role ===
                        "assistant"
                    ) {

                        updated[lastIndex] = {

                            role:
                                "assistant",

                            content:
                                error.message ||
                                "Resora is temporarily unavailable. Please try again."

                        };

                    } else {

                        updated.push({

                            role:
                                "assistant",

                            content:
                                error.message ||
                                "Resora is temporarily unavailable. Please try again."

                        });
                    }


                    return updated;
                }
            );


        } finally {

            setLoading(
                false
            );
        }
    }


    // =====================================================
    // NEW CHAT
    // =====================================================

    function startNewChat() {

        if (loading) {

            return;
        }


        setMessages([]);

        setInput("");

        setSidebarOpen(
            false
        );

        setHistoryError("");
    }


    // =====================================================
    // QUICK PROMPT
    // =====================================================

    function usePrompt(
        prompt
    ) {

        setInput(
            prompt
        );


        setSidebarOpen(
            false
        );


        setTimeout(
            () => {

                document
                    .getElementById(
                        "message"
                    )
                    ?.focus();

            },
            0
        );
    }


    // =====================================================
    // AUTH LOADING
    // =====================================================

    if (authLoading) {

        return (

            <main className="auth-page">

                <section className="auth-card loading-card">

                    <div className="auth-logo">
                        R
                    </div>


                    <h1>
                        Resora
                    </h1>


                    <p>
                        Loading your research workspace...
                    </p>

                </section>

            </main>
        );
    }


    // =====================================================
    // LOGIN SCREEN
    // =====================================================

    if (!user) {

        return (

            <main className="auth-page">

                <div className="auth-background"></div>


                <section className="auth-card">

                    <div className="auth-logo">
                        R
                    </div>


                    <div className="auth-heading">

                        <div className="auth-eyebrow">
                            RESEARCH INTELLIGENCE
                        </div>


                        <h1>
                            Welcome to Resora
                        </h1>


                        <p>
                            Your AI research companion for
                            NLP, machine learning, and academic exploration.
                        </p>

                    </div>


                    {/* Google */}

                    <button
                        className="google-button"
                        type="button"
                        disabled={
                            authSubmitting
                        }
                        onClick={
                            handleGoogleSignIn
                        }
                    >

                        <span className="google-icon">
                            G
                        </span>


                        <span>
                            Continue with Google
                        </span>

                    </button>


                    <div className="auth-divider">
                        <span>
                            OR
                        </span>
                    </div>


                    {/* Email */}

                    <form
                        className="auth-form"
                        onSubmit={
                            handleEmailAuth
                        }
                    >

                        <label>
                            Email
                        </label>


                        <input
                            type="email"
                            value={
                                email
                            }
                            onChange={
                                (event) =>
                                    setEmail(
                                        event.target.value
                                    )
                            }
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={
                                authSubmitting
                            }
                        />


                        <label>
                            Password
                        </label>


                        <input
                            type="password"
                            value={
                                password
                            }
                            onChange={
                                (event) =>
                                    setPassword(
                                        event.target.value
                                    )
                            }
                            placeholder="••••••••"
                            autoComplete={
                                authMode ===
                                "login"
                                    ? "current-password"
                                    : "new-password"
                            }
                            disabled={
                                authSubmitting
                            }
                        />


                        {authError && (

                            <div className="auth-error">
                                {authError}
                            </div>

                        )}


                        <button
                            className="email-button"
                            type="submit"
                            disabled={
                                authSubmitting
                            }
                        >

                            {authSubmitting

                                ? "Please wait..."

                                : authMode ===
                                  "login"

                                    ? "Sign in"

                                    : "Create account"}

                        </button>

                    </form>


                    <div className="auth-switch">

                        {authMode ===
                        "login"

                            ? "Don't have an account?"

                            : "Already have an account?"}


                        <button
                            type="button"
                            onClick={() => {

                                setAuthMode(
                                    authMode ===
                                    "login"
                                        ? "signup"
                                        : "login"
                                );

                                setAuthError("");

                            }}
                        >

                            {authMode ===
                            "login"

                                ? "Create one"

                                : "Sign in"}

                        </button>

                    </div>


                    <div className="auth-footer">

                        LLM-POWERED RESEARCH ASSISTANT

                    </div>

                </section>

            </main>
        );
    }


    // =====================================================
    // MAIN RESORA APP
    // =====================================================

    return (

        <div className="resora-app">


            {/* =================================================
                 SIDEBAR
                 ================================================= */}

            <aside
                className={
                    sidebarOpen
                        ? "sidebar sidebar-open"
                        : "sidebar"
                }
            >

                <div className="logo-area">

                    <div className="logo-core">
                        R
                    </div>


                    <div>

                        <h1>
                            Resora
                        </h1>


                        <p>
                            AI Research Assistant
                        </p>

                    </div>

                </div>


                <button
                    className="new-chat-button"
                    type="button"
                    onClick={
                        startNewChat
                    }
                    disabled={
                        loading
                    }
                >

                    <span className="plus-icon">
                        +
                    </span>


                    <span>
                        New chat
                    </span>

                </button>


                {/* Workspace */}

                <div className="sidebar-section">

                    <div className="section-label">
                        WORKSPACE
                    </div>


                    <button
                        className="side-item active"
                        type="button"
                    >

                        <span>
                            ⌕
                        </span>


                        <span>
                            Research Assistant
                        </span>

                    </button>


                    <button
                        className="side-item"
                        type="button"
                        onClick={() =>
                            usePrompt(
                                "Give me several research ideas related to Natural Language Processing."
                            )
                        }
                    >

                        <span>
                            ◇
                        </span>


                        <span>
                            Research Ideas
                        </span>

                    </button>


                    <button
                        className="side-item"
                        type="button"
                        onClick={() =>
                            usePrompt(
                                "Help me design a research methodology for my NLP research."
                            )
                        }
                    >

                        <span>
                            ◎
                        </span>


                        <span>
                            Methodology
                        </span>

                    </button>


                    <button
                        className="side-item"
                        type="button"
                        onClick={() =>
                            usePrompt(
                                "How should I conduct a literature review for an NLP research topic?"
                            )
                        }
                    >

                        <span>
                            ◈
                        </span>


                        <span>
                            Literature Support
                        </span>

                    </button>

                </div>


                {/* Current session */}

                <div className="sidebar-section">

                    <div className="section-label">
                        CURRENT SESSION
                    </div>


                    <button
                        className="session-item"
                        type="button"
                    >

                        <span className="session-dot"></span>


                        <span>
                            Research Session
                        </span>

                    </button>

                </div>


                {/* Bottom */}

                <div className="sidebar-bottom">

                    <div className="system-card">

                        <div className="status-row">

                            <span className="status-light"></span>


                            <span>
                                SYSTEM ONLINE
                            </span>

                        </div>


                        <div className="system-details">
                            Groq · GPT-OSS-120B
                        </div>

                    </div>


                    <div className="account-area">

                        <div className="account-email">
                            {user.email}
                        </div>


                        <button
                            className="signout-button"
                            type="button"
                            onClick={
                                handleSignOut
                            }
                        >
                            Sign out
                        </button>

                    </div>


                    <div className="copyright">

                        <div className="copyright-title">
                            LLM-POWERED RESEARCH ASSISTANT
                        </div>


                        <div className="developer-name">

                            Developed by{" "}

                            <strong>
                                Irfan Ferdous Siam
                            </strong>

                        </div>


                        <div className="social-links">

                            <a
                                href="https://github.com/IrfanTech-X"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                GitHub
                            </a>


                            <span>·</span>


                            <a
                                href="https://www.linkedin.com/in/irfan-ferdous-siam/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                LinkedIn
                            </a>


                            <span>·</span>


                            <a
                                href="https://irfanferdous.netlify.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Portfolio
                            </a>

                        </div>

                    </div>

                </div>

            </aside>


            {/* =================================================
                 MAIN
                 ================================================= */}

            <main className="resora-main">


                {/* Header */}

                <header className="resora-header">

                    <button
                        className="mobile-menu"
                        type="button"
                        aria-label="Open sidebar"
                        onClick={() =>
                            setSidebarOpen(
                                true
                            )
                        }
                    >
                        ☰
                    </button>


                    <div className="header-brand">

                        <div className="header-mark">
                            R
                        </div>


                        <div>

                            <h2>
                                Resora
                            </h2>


                            <p>
                                AI Research Assistant
                            </p>

                        </div>

                    </div>


                    <div className="header-actions">

                        <div className="model-badge">
                            GPT-OSS-120B
                        </div>


                        <button
                            className="header-new-chat"
                            type="button"
                            onClick={
                                startNewChat
                            }
                        >

                            + New chat

                        </button>

                    </div>

                </header>


                {/* =================================================
                     CHAT AREA
                     ================================================= */}

                <section className="chat-area">


                    {historyError && (

                        <div className="history-warning">

                            {historyError}

                        </div>

                    )}


                    {/* ---------------------------------------------
                         EMPTY STATE
                         --------------------------------------------- */}

                    {messages.length === 0 &&
                        !historyLoading && (

                        <section className="welcome-screen">

                            <div className="welcome-core">
                                R
                            </div>


                            <div className="welcome-eyebrow">
                                RESEARCH INTELLIGENCE
                            </div>


                            <h1>

                                Welcome to{" "}

                                <span>
                                    Resora
                                </span>

                            </h1>


                            <p className="welcome-description">

                                Your AI research companion for
                                exploring research topics,
                                methodologies, NLP, machine learning,
                                and academic ideas.

                            </p>


                            <div className="research-grid">


                                <button
                                    className="research-card"
                                    type="button"
                                    onClick={() =>
                                        usePrompt(
                                            "What is sentiment analysis in Bangla NLP?"
                                        )
                                    }
                                >

                                    <div className="card-icon">
                                        ◈
                                    </div>


                                    <div className="card-text">

                                        <strong>
                                            Explore a Topic
                                        </strong>


                                        <span>
                                            Understand a research concept
                                        </span>

                                    </div>


                                    <span className="card-arrow">
                                        →
                                    </span>

                                </button>


                                <button
                                    className="research-card"
                                    type="button"
                                    onClick={() =>
                                        usePrompt(
                                            "How should I design a research methodology for Bangla sentiment classification?"
                                        )
                                    }
                                >

                                    <div className="card-icon">
                                        ◇
                                    </div>


                                    <div className="card-text">

                                        <strong>
                                            Design Methodology
                                        </strong>


                                        <span>
                                            Plan your research approach
                                        </span>

                                    </div>


                                    <span className="card-arrow">
                                        →
                                    </span>

                                </button>


                                <button
                                    className="research-card"
                                    type="button"
                                    onClick={() =>
                                        usePrompt(
                                            "What are the major challenges and potential research gaps in Bangla natural language processing?"
                                        )
                                    }
                                >

                                    <div className="card-icon">
                                        ◎
                                    </div>


                                    <div className="card-text">

                                        <strong>
                                            Find Research Gaps
                                        </strong>


                                        <span>
                                            Discover possible directions
                                        </span>

                                    </div>


                                    <span className="card-arrow">
                                        →
                                    </span>

                                </button>


                                <button
                                    className="research-card"
                                    type="button"
                                    onClick={() =>
                                        usePrompt(
                                            "Explain how transformer models can be used for text classification research."
                                        )
                                    }
                                >

                                    <div className="card-icon">
                                        ⬡
                                    </div>


                                    <div className="card-text">

                                        <strong>
                                            Analyze Technology
                                        </strong>


                                        <span>
                                            Explore modern NLP techniques
                                        </span>

                                    </div>


                                    <span className="card-arrow">
                                        →
                                    </span>

                                </button>

                            </div>

                        </section>

                    )}


                    {/* ---------------------------------------------
                         HISTORY LOADING
                         --------------------------------------------- */}

                    {historyLoading && (

                        <div className="history-loading">

                            Loading your research session...

                        </div>

                    )}


                    {/* ---------------------------------------------
                         MESSAGES
                         --------------------------------------------- */}

                    {messages.length > 0 && (

                        <div className="messages">


                            {messages.map(
                                (message, index) => (

                                    <article
                                        key={
                                            `${message.role}-${index}`
                                        }

                                        className={
                                            message.role === "user"
                                                ? "chat-message user-message"
                                                : "chat-message resora-message"
                                        }
                                    >

                                        <div className="message-label">

                                            {message.role === "user"
                                                ? "You"
                                                : "Resora"}

                                        </div>


                                        <div className="message-body">

                                            {message.role === "assistant" ? (

                                                 <div
                                                       className="markdown-content"
                                                       dangerouslySetInnerHTML={{
                                                          __html: DOMPurify.sanitize(
                                                             marked.parse(
                                                                  message.content || ""
                                                                )
                                                            )
                                                         }}
                                                 />

                                                ) : (

                                                         message.content

                                             )}

                                        </div>

                                    </article>

                                )
                            )}


                            {loading &&
                                messages[
                                    messages.length - 1
                                ]?.role !== "assistant" && (

                                <article className="chat-message resora-message">

                                    <div className="message-label">
                                        Resora
                                    </div>


                                    <div className="typing-indicator">

                                        <span></span>
                                        <span></span>
                                        <span></span>

                                    </div>

                                </article>

                            )}


                            <div
                                ref={
                                    messagesEndRef
                                }
                            />

                        </div>

                    )}

                </section>


                {/* =================================================
                     COMPOSER
                     ================================================= */}

                <footer className="composer-area">

                    <div className="composer-shell">

                        <form
                            id="chat-form"
                            className="composer"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <textarea
                                id="message"
                                value={input}
                                onChange={
                                    (event) =>
                                        setInput(
                                            event.target.value
                                        )
                                }
                                onKeyDown={
                                    (event) => {

                                        if (
                                            event.key === "Enter" &&
                                            !event.shiftKey
                                        ) {

                                            event.preventDefault();

                                            event.currentTarget.form.requestSubmit();

                                        }
                                    }
                                }
                                maxLength={
                                    MAX_MESSAGE_LENGTH
                                }
                                rows={1}
                                placeholder="Ask Resora a research question..."
                                disabled={
                                    loading
                                }
                            />


                            <button
                                id="send-button"
                                type="submit"
                                disabled={
                                    loading ||
                                    !input.trim()
                                }
                                aria-label="Send message"
                            >

                                ↑

                            </button>

                        </form>


                        <div className="composer-footer">

                            <span>
                                ENTER TO SEND · SHIFT + ENTER FOR NEW LINE
                            </span>


                            <span>
                                {input.length} / {MAX_MESSAGE_LENGTH}
                            </span>

                        </div>

                    </div>


                    <div className="composer-disclaimer">

                        Resora can make mistakes.
                        Verify important academic claims using reliable sources.

                    </div>

                </footer>

            </main>


            {/* =================================================
                 MOBILE OVERLAY
                 ================================================= */}

            {sidebarOpen && (

                <div
                    className="sidebar-overlay"
                    onClick={() =>
                        setSidebarOpen(
                            false
                        )
                    }
                ></div>

            )}

        </div>
    );
}