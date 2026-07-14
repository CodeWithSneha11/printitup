import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

import { db } from "../firebase";


const Notifications = () => {

  const [notifications, setNotifications] = useState([]);

  const uid = localStorage.getItem("uid");


  useEffect(() => {

    if (!uid) return;


    const q = query(

      collection(db, "notifications"),

      where("userId", "==", uid),

      orderBy("createdAt", "desc")

    );


    const unsubscribe = onSnapshot(q, (snapshot) => {

      const data = snapshot.docs.map((doc) => ({

        id: doc.id,

        ...doc.data(),

      }));


      setNotifications(data);

    });


    return () => unsubscribe();


  }, [uid]);



  return (

    <div>

      <h2>
        Notifications
      </h2>


      {
        notifications.length === 0 ? (

          <p>
            No notifications
          </p>

        ) : (

          notifications.map((item) => (

            <div key={item.id}>

              <h4>
                {item.title}
              </h4>

              <p>
                {item.message}
              </p>

            </div>

          ))

        )
      }


    </div>

  );

};


export default Notifications;