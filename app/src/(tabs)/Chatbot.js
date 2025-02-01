import '../styles/Chatbot.css';
import Message from '../components/Message.js';
import { useState, useRef, useEffect } from 'react';
import { db } from '../config/firebase.js';
import { collection, doc, addDoc, serverTimestamp, getDocs, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

function Chatbot() {
    const [messages, setMessages] = useState([
        { isBot: true, name: 'botER', text: "Hello! I'm botER, your assistant for all things related to entity-relationship queries. Before we start, please enter a chat name to ensure your chat history is saved. Otherwise, it won't be stored. How can I assist you today?" },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Track loading state
    const messagesEndRef = useRef(null);
    //const { chatroomId } = useParams(); not sure if routing is needed yet
    const [chatroomId, setChatroomId] = useState("");

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // nid to implement add message logic here too 
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputText.trim() && !isLoading) { // Prevent sending if loading
            setIsLoading(true); // Disable input while waiting

            setMessages(prev => [
                ...prev,
                { isBot: false, name: 'You', text: inputText },
            ]);

            addMessage(chatroomId,'UserMessages',inputText)
            try {
                const response = await fetch("http://127.0.0.1:5000/get", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({ msg: inputText }),
                });

                const botReply = await response.text();
                
                setMessages(prev => [
                    ...prev,
                    { isBot: true, name: 'botER', text: botReply },
                ]);
                addMessage(chatroomId, 'BotMessages', botReply)
            } catch (error) {
                console.error("Error fetching bot response:", error);
            }

            setIsLoading(false); // Re-enable input after response
            setInputText('');
        }
    };


    const handleChatroomIdSubmit = async (e) => {
        e.preventDefault();
        const chatroomName = chatroomId.trim();
    
        if (!chatroomName) return;
    
        try {
            const chatroomRef = doc(db, 'Chatroom', chatroomName);
            const chatroomSnapshot = await getDoc(chatroomRef);
    
            if (chatroomSnapshot.exists()) {
                // If chatroom exists, fetch messages
                await fetchMessages(chatroomName);
            } else {
                // If chatroom does not exist, create it
                await setDoc(chatroomRef, {
                    createdAt: serverTimestamp()
                });

                const botMessagesRef = collection(chatroomRef, 'BotMessages');
                const userMessagesRef = collection(chatroomRef, 'UserMessages');

                await Promise.all([
                    addDoc(botMessagesRef, { content: "How may I help you today?", createdAt: serverTimestamp() }),
                    addDoc(userMessagesRef, { content: "User Created", createdAt: serverTimestamp() })
                ]);
            }
    
            setChatroomId(chatroomName);
        } catch (error) {
            console.error("Error checking/creating chatroom:", error);
        }
    };
    
    const fetchMessages = async (chatroomId) => {
        try {
          const chatroomRef = doc(db, 'Chatroom', chatroomId);
          const botMessagesRef = collection(chatroomRef, 'BotMessages');
          const userMessagesRef = collection(chatroomRef, 'UserMessages');
  
          const botSnapshot = await getDocs(botMessagesRef);
          const userSnapshot = await getDocs(userMessagesRef);

        const botMessages = botSnapshot.docs.map(doc => ({
            isBot:true,
            name: 'botER',
            text: doc.data().content,
            createdAt: doc.data().createdAt?.toMillis?.() || 0 
        }));

        const userMessages = userSnapshot.docs.map(doc => ({
            isBot:false,
            name: 'You',
            text: doc.data().content,
            createdAt: doc.data().createdAt?.toMillis?.() || 0 
        }));

        const allMessages = [...botMessages, ...userMessages].sort(
            (a, b) => a.createdAt - b.createdAt //not sure if my ascending or descending
        );

        setMessages(allMessages);
        return allMessages;
        } catch (error) {
          console.error("Error fetching messages:", error);
          return [];
        }
      };
    
      useEffect(() => {
        const fetchChatroomMessages = async () => {
            try {
                if (!chatroomId) return; // Ensure chatroomId is available
    
                await fetchMessages(chatroomId);
            } catch (error) {
                console.error("Error fetching chatroom messages:", error);
            }
        };
    
        fetchChatroomMessages();
    }, [chatroomId]);
    
    
      const addMessage = async (chatroomId, collectionName, content) => {
        try {
          const chatroomRef = doc(db, 'Chatroom', chatroomId);
          const messagesRef = collection(chatroomRef, collectionName);
          await addDoc(messagesRef, {
            content: content,
            createdAt: serverTimestamp()
          });
      
          //await fetchMessages(chatroomId);
        } catch (error) {
          console.error("Error adding message:", error);
        }
      };
    

      const deleteChat = async (chatroomId) => {
        try {
          if (!chatroomId ) {
            throw new Error("Chatroom is missing");
          }
          const chatroomRef = doc(db, 'Chatroom', chatroomId);
            const botMessagesRef = collection(chatroomRef, 'BotMessages');
            const userMessagesRef = collection(chatroomRef, 'UserMessages');

            const [botSnapshot, userSnapshot] = await Promise.all([
                getDocs(botMessagesRef),
                getDocs(userMessagesRef),
            ]);

            const deletePromises = [
                ...botSnapshot.docs.map(doc => deleteDoc(doc.ref)),
                ...userSnapshot.docs.map(doc => deleteDoc(doc.ref)),
            ];

            await Promise.all(deletePromises);

            setMessages([]);
        } catch (error) {
          console.error("Error deleting message:", error);
        }
      };
    

    
    return (
        <div className="Container">
            <div>
                <p className="Header">Your ER Diagram Questions, Answered Here</p>
                <p className="Subtitles">Powered by OpenAI</p>
            </div>

            <div className="ChatNameContainer">
                <form onSubmit={(e) => handleChatroomIdSubmit(e)}>
                    <input
                        type="text"
                        placeholder={isLoading ? "Waiting for response..." : "Enter Chatname"}
                        className="ChatNameInput"
                        value={chatroomId}
                        onChange={(e) => setChatroomId(e.target.value)}
                        disabled={isLoading} // Disable input when loading
                    />
                    <button type="submit" className="SubmitButton" disabled={isLoading}>
                        Submit
                    </button>
                </form>
            </div>

            <div className="DeleteChatContainer">
                <button className="DeleteChatButton" type = "button" onClick = {() => deleteChat(chatroomId)} style={{ background: 'none', border: 'none' }} disabled={isLoading}> Clear Chat </button>
            </div>

            <div className="Messages">
                {messages.map((msg, index) => (
                    <Message
                        key={index}
                        isBot={msg.isBot}
                        name={msg.name}
                        text={<div>{<ReactMarkdown>{msg.text.replace(/<think>.*?<\/think>/gs, '')}</ReactMarkdown>}</div>}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="TextBox">
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder={isLoading ? "Waiting for response..." : "Message botER."}
                        className="TextInput"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isLoading} // Disable input when loading
                    />
                    <button type="submit" style={{ background: 'none', border: 'none' }} disabled={isLoading}>
                        <ion-icon name={isLoading ? "hourglass-outline" : "arrow-up-circle"}></ion-icon>
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chatbot;
