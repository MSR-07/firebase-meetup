import React, { useEffect } from "react";
import { addDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";

const Guestbook = ({ user, db }) => {
  useEffect(() => {
    const q = query(collection(db, "guestbook"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snaps) => {
      const guestbook = document.getElementById("guestbook");
      guestbook.innerHTML = "";
      snaps.forEach((doc) => {
        const entry = document.createElement("p");
        entry.textContent = `${doc.data().name}: ${doc.data().text}`;
        guestbook.appendChild(entry);
      });
    });
    return () => unsubscribe();
  }, [db]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById("message");
    try {
      await addDoc(collection(db, "guestbook"), {
        text: input.value,
        timestamp: Date.now(),
        name: user.displayName,
        userId: user.uid,
      });
      input.value = "";
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section id="guestbook-container">
      <h2>Discussion</h2>
      <form id="leave-message" onSubmit={handleSubmit}>
        <label>Leave a message: </label>
        <input type="text" id="message" />
        <button type="submit">
          <i className="material-icons">send</i>
          <span>SEND</span>
        </button>
      </form>
      <section id="guestbook"></section>
    </section>
  );
};

export default Guestbook;
