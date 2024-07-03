import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { getAuth, onAuthStateChanged, signOut, EmailAuthProvider } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, setDoc, doc, where } from 'firebase/firestore';
import * as firebaseui from 'firebaseui';
import { db } from './firebaseConfig';

const App = () => {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [ui, setUi] = useState(null);
  const [guestbook, setGuestbook] = useState([]);
  const [attendingCount, setAttendingCount] = useState(0);
  const [attending, setAttending] = useState(null);

  const guestbookUnsubscribe = useRef(null);
  const currentRSVPUnsubscribe = useRef(null);
  const attendingCountUnsubscribe = useRef(null);
  const authUiInstance = useRef(null); // Reference to AuthUI instance

  useEffect(() => {
    // Initialize FirebaseUI Auth if not already initialized
    if (!authUiInstance.current) {
      authUiInstance.current = new firebaseui.auth.AuthUI(auth);
    }
    setUi(authUiInstance.current);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        subscribeGuestbook();
        subscribeCurrentRSVP(user);
      } else {
        unsubscribeGuestbook();
        unsubscribeCurrentRSVP();
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGuestbook();
      unsubscribeCurrentRSVP();
    };
  }, [auth]);

  const subscribeGuestbook = () => {
    const q = query(collection(db, 'guestbook'), orderBy('timestamp', 'desc'));
    guestbookUnsubscribe.current = onSnapshot(q, (snapshot) => {
      setGuestbook(snapshot.docs.map((doc) => doc.data()));
    });
  };

  const unsubscribeGuestbook = () => {
    if (guestbookUnsubscribe.current) {
      guestbookUnsubscribe.current();
      guestbookUnsubscribe.current = null;
    }
  };

  const subscribeCurrentRSVP = (user) => {
    const ref = doc(db, 'attendees', user.uid);
    currentRSVPUnsubscribe.current = onSnapshot(ref, (doc) => {
      if (doc.exists) {
        const attendingResponse = doc.data().attending;
        setAttending(attendingResponse);
      }
    });

    const attendingQuery = query(
      collection(db, 'attendees'),
      where('attending', '==', true)
    );
    attendingCountUnsubscribe.current = onSnapshot(attendingQuery, (snap) => {
      setAttendingCount(snap.docs.length);
    });
  };

  const unsubscribeCurrentRSVP = () => {
    if (currentRSVPUnsubscribe.current) {
      currentRSVPUnsubscribe.current();
      currentRSVPUnsubscribe.current = null;
    }
    if (attendingCountUnsubscribe.current) {
      attendingCountUnsubscribe.current();
      attendingCountUnsubscribe.current = null;
    }
  };

  const handleRSVPYes = async () => {
    const userRef = doc(db, 'attendees', auth.currentUser.uid);
    await setDoc(userRef, { attending: true });
  };

  const handleRSVPNo = async () => {
    const userRef = doc(db, 'attendees', auth.currentUser.uid);
    await setDoc(userRef, { attending: false });
  };

  const handleRSVPButton = () => {
    if (auth.currentUser) {
      signOut(auth);
    } else {
      ui.start('#firebaseui-auth-container', {
        signInOptions: [EmailAuthProvider.PROVIDER_ID],
        callbacks: {
          signInSuccessWithAuthResult: () => false,
        },
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    await addDoc(collection(db, 'guestbook'), {
      text: input.value,
      timestamp: Date.now(),
      name: auth.currentUser.displayName,
      userId: auth.currentUser.uid,
    });
    input.value = '';
  };

  return (
    <div id="app">
      <img
        src="https://firebasestorage.googleapis.com/v0/b/fir-images-a61c9.appspot.com/o/codelab.png?alt=media&token=f45f808c-ce40-4b34-944c-8d8fac00e13d"
        alt="Firebase Meetup"
      />
      <section id="event-details-container">
        <h1>Firebase Meetup</h1>
        <p><i className="material-icons">calendar_today</i> October 30</p>
        <p><i className="material-icons">location_city</i> Faisalabad</p>
        <button id="startRsvp" onClick={handleRSVPButton}>
          {user ? 'LOGOUT' : 'RSVP'}
        </button>
      </section>
      <hr />
      <section id="firebaseui-auth-container"></section>
      <section id="description-container">
        <p id="number-attending">{attendingCount} people going</p>
        <h2>What we'll be doing</h2>
        <p>Join us for a day full of Firebase Workshops and Pizza!</p>
      </section>
      {user && (
        <section id="guestbook-container">
          <h2>Are you attending?</h2>
          <button id="rsvp-yes" onClick={handleRSVPYes} className={attending ? 'clicked' : ''}>YES</button>
          <button id="rsvp-no" onClick={handleRSVPNo} className={attending === false ? 'clicked' : ''}>NO</button>
          <h2>Discussion</h2>
          <form id="leave-message" onSubmit={handleFormSubmit}>
            <label>Leave a message: </label>
            <input type="text" id="message" />
            <button type="submit">
              <i className="material-icons">send</i>
              <span>SEND</span>
            </button>
          </form>
          <section id="guestbook">
            {guestbook.map((entry, index) => (
              <p key={index}>{entry.name}: {entry.text}</p>
            ))}
          </section>
        </section>
      )}
    </div>
  );
};

export default App;
