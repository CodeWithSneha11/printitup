import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";

// ==========================
// GET ALL ADDRESSES
// users -> uid -> addresses
// ==========================

export const getUserAddresses = async (uid) => {
  try {
    const addressRef = collection(db, "users", uid, "addresses");

    const snapshot = await getDocs(addressRef);

    const addresses = snapshot.docs.map((item) => ({
      id: item.id,

      ...item.data(),
    }));

    return addresses;
  } catch (error) {
    console.log("Fetch Address Error:", error);

    throw error;
  }
};

// ==========================
// ADD NEW ADDRESS
// ==========================

export const addAddress = async (uid, address) => {
  try {
    const addressRef = collection(
      db,

      "users",

      uid,

      "addresses",
    );

    await addDoc(
      addressRef,

      address,
    );
  } catch (error) {
    console.log("Add Address Error:", error);

    throw error;
  }
};

// ==========================
// UPDATE EXISTING ADDRESS
// ==========================

export const updateAddress = async (uid, addressId, updatedData) => {
  try {
    const addressRef = doc(
      db,

      "users",

      uid,

      "addresses",

      addressId,
    );

    await updateDoc(
      addressRef,

      updatedData,
    );
  } catch (error) {
    console.log("Update Address Error:", error);

    throw error;
  }
};

// ==========================
// DELETE ADDRESS
// ==========================

export const deleteAddress = async (uid, addressId) => {
  try {
    const addressRef = doc(
      db,

      "users",

      uid,

      "addresses",

      addressId,
    );

    await deleteDoc(addressRef);
  } catch (error) {
    console.log("Delete Address Error:", error);

    throw error;
  }
};

// ==========================
// SET DEFAULT ADDRESS
// Only one default address
// ==========================

export const setDefaultAddress = async (uid, addresses, selectedId) => {
  try {
    const addressCollection = collection(
      db,

      "users",

      uid,

      "addresses",
    );

    const updates = addresses.map((item) => {
      const addressRef = doc(
        addressCollection,

        item.id,
      );

      return updateDoc(
        addressRef,

        {
          isDefault: item.id === selectedId,
        },
      );
    });

    await Promise.all(updates);
  } catch (error) {
    console.log("Default Address Error:", error);

    throw error;
  }
};
