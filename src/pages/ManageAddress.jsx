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
import {
  validateAddress,
  sanitizeAddress,
} from "../utils/addressValidation";

import "../styles/ManageAddress.css";

const ManageAddress = () => {
  const uid = localStorage.getItem("uid");

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editAddress, setEditAddress] = useState(null);

  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ==========================
  // FETCH ADDRESSES
  // ==========================

  const loadAddresses = useCallback(async () => {
    if (!uid) {
      setPageError("Please login to manage your addresses.");
      setLoading(false);
      return;
    }

    setPageError("");

    try {
      const data = await getUserAddresses(uid);
      setAddresses(data);
    } catch (error) {
      console.error("Loading address error:", error);
      setPageError(
        "Unable to load your addresses. Please refresh the page and try again."
      );
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
    const { isValid, errorList } = validateAddress(address);

    if (!isValid) {
      setFormError(errorList[0]);
      return;
    }

    setFormError("");
    setSaving(true);

    const cleanAddress = sanitizeAddress(address);

    try {
      if (editAddress) {
        await updateAddress(uid, editAddress.id, cleanAddress);
      } else {
        await addAddress(uid, cleanAddress);
      }

      await loadAddresses();

      setShowModal(false);
      setEditAddress(null);
      setFormError("");
    } catch (error) {
      console.error("Save error:", error);

      setFormError(
        "Unable to save your address. Please check your internet connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // EDIT ADDRESS
  // ==========================

  const handleEdit = (address) => {
    setFormError("");
    setEditAddress(address);
    setShowModal(true);
  };
    // ==========================
  // DELETE ADDRESS
  // ==========================

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this address?"
    );

    if (!confirmDelete) return;

    setActionLoading(true);
    setPageError("");

    try {
      await deleteAddress(uid, id);
      await loadAddresses();
    } catch (error) {
      console.error("Delete address error:", error);

      setPageError(
        "Unable to delete the address. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================
  // SET DEFAULT ADDRESS
  // ==========================

  const handleDefault = async (id) => {
    setActionLoading(true);
    setPageError("");

    try {
      await setDefaultAddress(uid, addresses, id);
      await loadAddresses();
    } catch (error) {
      console.error("Set default address error:", error);

      setPageError(
        "Unable to set the default address. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================
  // LOADING
  // ==========================

  if (loading) {
    return (
      <div className="manage-address-container">
        <h2>Loading Addresses...</h2>
      </div>
    );
  }

  // ==========================
  // USER NOT LOGGED IN
  // ==========================

  if (!uid) {
    return (
      <div className="manage-address-container">
        <h2>Please login to manage your addresses.</h2>
      </div>
    );
  }

  return (
    <div className="manage-address-container">
      <div className="manage-header">
        <h1>My Addresses</h1>

        <button
          className="add-address-btn"
          disabled={saving || actionLoading}
          onClick={() => {
            setFormError("");
            setEditAddress(null);
            setShowModal(true);
          }}
        >
          <FaPlus />
          Add Address
        </button>
      </div>

      {pageError && (
        <div className="address-error">
          {pageError}
        </div>
      )}

      {addresses.length === 0 && !pageError && (
        <p>No saved addresses found.</p>
      )}

      <div className="address-grid">
        {addresses.map((address) => (
          <div
            className="manage-address-card"
            key={address.id}
          >
            <div className="address-title">
              <h3>{address.label}</h3>

              {address.isDefault && (
                <span>Default</span>
              )}
            </div>
                        <p>
              <b>Name:</b>{" "}
              {address.fullName}
            </p>

            <p>
              <b>Phone:</b>{" "}
              {address.phone}
            </p>

            <p>
              {address.house}, {address.area}
            </p>

            <p>
              {address.city}, {address.state} - {address.pincode}
            </p>

            {address.landmark && (
              <p>
                <b>Landmark:</b>{" "}
                {address.landmark}
              </p>
            )}

            <div className="address-actions">
              <button
                disabled={actionLoading || address.isDefault}
                onClick={() => handleDefault(address.id)}
              >
                {address.isDefault
                  ? "Default Address"
                  : "Set Default"}
              </button>

              <button
                disabled={actionLoading}
                onClick={() => handleEdit(address)}
              >
                Edit
              </button>

              <button
                className="delete-btn"
                disabled={actionLoading}
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
            if (saving) return;

            setShowModal(false);
            setEditAddress(null);
            setFormError("");
          }}
                    onSave={handleSaveAddress}
          editAddress={editAddress}
          serverError={formError}
          saving={saving}
        />
      )}
    </div>
  );
};

export default ManageAddress;