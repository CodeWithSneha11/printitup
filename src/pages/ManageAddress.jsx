import React, { useEffect, useState, useCallback } from "react";
import { FaPlus } from "react-icons/fa";
import {
  getUserAddresses,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
  addAddress,
} from "../services/addressService";

import AddAddressModal from "../components/AddAddressModal";

import "../styles/ManageAddress.css";

const ManageAddress = () => {
  const uid = localStorage.getItem("uid");

  const [addresses, setAddresses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editAddress, setEditAddress] = useState(null);

  // ==========================
  // FETCH ADDRESSES
  // ==========================

  const loadAddresses = useCallback(async () => {
    try {
      const data = await getUserAddresses(uid);

      setAddresses(data);
    } catch (error) {
      console.log("Loading address error:", error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // ==========================
  // ADD / UPDATE ADDRESS
  // ==========================

  const handleSaveAddress = async (address) => {
    try {
      if (editAddress) {
        // UPDATE EXISTING ADDRESS

        await updateAddress(
          uid,

          editAddress.id,

          address,
        );
      } else {
        // ADD NEW ADDRESS

        await addAddress(
          uid,

          address,
        );
      }

      setShowModal(false);

      setEditAddress(null);

      loadAddresses();
    } catch (error) {
      console.log("Save error:", error);
    }
  };

  // ==========================
  // OPEN EDIT MODAL
  // ==========================

  const handleEdit = (address) => {
    setEditAddress(address);

    setShowModal(true);
  };

  // ==========================
  // DELETE ADDRESS
  // ==========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this address?");

    if (!confirmDelete) return;

    await deleteAddress(
      uid,

      id,
    );

    loadAddresses();
  };

  // ==========================
  // SET DEFAULT
  // ==========================

  const handleDefault = async (id) => {
    await setDefaultAddress(
      uid,

      addresses,

      id,
    );

    loadAddresses();
  };

  if (loading) {
    return (
      <div>
        <h2>Loading Addresses...</h2>
      </div>
    );
  }

  return (
    <div className="manage-address-container">
      <div className="manage-header">
        <h1>My Addresses</h1>

       <button
  className="add-address-btn"
  onClick={() => setShowModal(true)}
>
  <FaPlus />
  Add Address
</button>
      </div>

      {addresses.length === 0 && <p>No saved addresses found.</p>}

      <div className="address-grid">
        {addresses.map((address) => (
          <div className="manage-address-card" key={address.id}>
            <div className="address-title">
              <h3>{address.label}</h3>

              {address.isDefault && <span>Default</span>}
            </div>

            <p>
              <b>Name:</b>

              {address.fullName}
            </p>

            <p>
              <b>Phone:</b>

              {address.phone}
            </p>

            <p>
              {address.house},{address.area}
            </p>

            <p>
              {address.city},{address.state}-{address.pincode}
            </p>

            {address.landmark && (
              <p>
                Landmark:
                {address.landmark}
              </p>
            )}

            <div className="address-actions">
              <button onClick={() => handleDefault(address.id)}>
                Set Default
              </button>

              <button onClick={() => handleEdit(address)}>Edit</button>

              <button
                className="delete-btn"
                onClick={() => handleDelete(address.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddAddressModal
          onClose={() => {
            setShowModal(false);

            setEditAddress(null);
          }}
          onSave={handleSaveAddress}
          editAddress={editAddress}
        />
      )}
    </div>
  );
};

export default ManageAddress;
