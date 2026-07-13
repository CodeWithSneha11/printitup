import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import "../styles/Collections.css";

const CLOUD_NAME = "dfq3c3jkm";
const UPLOAD_PRESET = "printitup";

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);

  // Collection Modal
  const [showModal, setShowModal] = useState(false);

  // Add Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);

  // Collection Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");

  const [uploading, setUploading] = useState(false);

  // Product Form

  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productStock, setProductStock] = useState("");

  const [productImageFile, setProductImageFile] = useState(null);
  const [productPreview, setProductPreview] = useState("");

  const [savingProduct, setSavingProduct] = useState(false);

  // Edit Product

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);

  const [editProductName, setEditProductName] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductDescription, setEditProductDescription] = useState("");
  const [editProductStock, setEditProductStock] = useState("");

  const [editProductImageFile, setEditProductImageFile] = useState(null);

  const [editProductPreview, setEditProductPreview] = useState("");

  const [updatingProduct, setUpdatingProduct] = useState(false);

  // Fetch Collections

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "collections"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setCollections(data);
      },
    );

    return () => unsubscribe();
  }, []);

  // Fetch Products

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(data);
    });

    return () => unsubscribe();
  }, []);

  // Collection Image Select

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImageFile(file);

    setPreview(URL.createObjectURL(file));
  };

  // Product Image Select

  const handleProductImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setProductImageFile(file);

    setProductPreview(URL.createObjectURL(file));
  };

  // Upload Collection Image

  const uploadImage = async () => {
    const formData = new FormData();

    formData.append("file", imageFile);

    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    return data.secure_url;
  };

  // Upload Product Image

  const uploadProductImage = async () => {
    const formData = new FormData();

    formData.append("file", productImageFile);

    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    return data.secure_url;
  };

  // Add Collection

  const handleAddCollection = async (e) => {
    e.preventDefault();

    if (!name || !imageFile) {
      alert("Please fill required fields");

      return;
    }

    try {
      setUploading(true);

      const imageUrl = await uploadImage();

      await addDoc(collection(db, "collections"), {
        name,

        description,

        image: imageUrl,

        createdAt: serverTimestamp(),
      });

      alert("Collection added successfully");

      setName("");
      setDescription("");
      setImageFile(null);
      setPreview("");

      setShowModal(false);
    } catch (error) {
      console.log(error);

      alert("Failed to add collection");
    } finally {
      setUploading(false);
    }
  };

  // Delete Collection

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this collection?");

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "collections", id));
  };

  // Delete Product

  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("Delete this product?");

    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "products", id));

      alert("Product deleted successfully");
    } catch (error) {
      console.log(error);

      alert("Failed to delete product");
    }
  };

  // Add Product

  const handleAddProduct = async () => {
    if (!productName || !productPrice || !productImageFile) {
      alert("Please fill required fields");

      return;
    }

    try {
      setSavingProduct(true);

      const imageUrl = await uploadProductImage();

      await addDoc(collection(db, "products"), {
        name: productName,

        price: Number(productPrice),

        description: productDescription,

        stock: Number(productStock),

        image: imageUrl,

        collectionId: selectedCollection.id,

        collectionName: selectedCollection.name,

        createdAt: serverTimestamp(),
      });

      alert("Product added successfully");

      setProductName("");
      setProductPrice("");
      setProductDescription("");
      setProductStock("");

      setProductImageFile(null);
      setProductPreview("");

      setShowProductModal(false);

      setSelectedCollection(null);
    } catch (error) {
      console.log(error);

      alert("Failed to add product");
    } finally {
      setSavingProduct(false);
    }
  };
  // Open Edit Product Modal

  const handleEditProduct = (product) => {
    setEditingProduct(product);

    setEditProductName(product.name);
    setEditProductPrice(product.price);
    setEditProductDescription(product.description);
    setEditProductStock(product.stock);

    setEditProductPreview(product.image);

    setShowEditModal(true);
  };

  // Edit Product Image

  const handleEditProductImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setEditProductImageFile(file);

    setEditProductPreview(URL.createObjectURL(file));
  };

  // Update Product

  const updateProduct = async () => {
    try {
      setUpdatingProduct(true);

      let imageUrl = editingProduct.image;

      if (editProductImageFile) {
        const formData = new FormData();

        formData.append("file", editProductImageFile);

        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,

          {
            method: "POST",
            body: formData,
          },
        );

        const data = await response.json();

        imageUrl = data.secure_url;
      }

      await updateDoc(
        doc(db, "products", editingProduct.id),

        {
          name: editProductName,

          price: Number(editProductPrice),

          description: editProductDescription,

          stock: Number(editProductStock),

          image: imageUrl,
        },
      );

      alert("Product updated successfully");

      setShowEditModal(false);

      setEditingProduct(null);
    } catch (error) {
      console.log(error);

      alert("Update failed");
    } finally {
      setUpdatingProduct(false);
    }
  };

  // Product Count

  const getProductCount = (collectionId) => {
    return products.filter((product) => product.collectionId === collectionId)
      .length;
  };

  return (
    <div className="collections-page">
      {/* Header */}

      <div className="collections-header">
        <div>
          <h2>Collection Management</h2>

          <p>Manage collections and products</p>
        </div>

        <button className="primary-btn" onClick={() => setShowModal(true)}>
          + Add Collection
        </button>
      </div>

      {/* Collection Cards */}

      <div className="collection-grid">
        {collections.map((item) => (
          <div className="collection-card" key={item.id}>
            <img
              src={item.image}
              alt={item.name}
              className="collection-image"
            />

            <div className="collection-content">
              <h3>{item.name}</h3>

              <p>{item.description}</p>

              <div className="product-count">
                Total Products : {getProductCount(item.id)}
              </div>

              {/* Products List */}

              <div className="products-list">
                {products
                  .filter((product) => product.collectionId === item.id)
                  .map((product) => (
                    <div className="product-item" key={product.id}>
                      <img src={product.image} alt={product.name} />

                      <div className="product-info">
                        <h4>{product.name}</h4>

                        <p>₹{product.price}</p>
                      </div>

                      <div className="product-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="product-delete-btn"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="card-actions">
                <button
                  className="primary-btn"
                  onClick={() => {
                    setSelectedCollection(item);

                    setShowProductModal(true);
                  }}
                >
                  + Add Product
                </button>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Collection Modal */}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Add Collection</h2>

            <form onSubmit={handleAddCollection}>
              <input
                placeholder="Collection Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              {preview && (
                <img src={preview} className="preview-image" alt="preview" />
              )}

              <button className="primary-btn" disabled={uploading}>
                {uploading ? "Uploading..." : "Save Collection"}
              </button>

              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Product Modal */}

      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Add Product</h2>

            <p>
              Collection :<b> {selectedCollection?.name}</b>
            </p>

            <input
              placeholder="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />

            <input
              type="number"
              placeholder="Price"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
            />

            <textarea
              placeholder="Product Description"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
            />

            <input
              type="number"
              placeholder="Stock Quantity"
              value={productStock}
              onChange={(e) => setProductStock(e.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleProductImageChange}
            />

            {productPreview && (
              <img
                src={productPreview}
                className="preview-image"
                alt="preview"
              />
            )}

            <button
              className="primary-btn"
              onClick={handleAddProduct}
              disabled={savingProduct}
            >
              {savingProduct ? "Saving..." : "Save Product"}
            </button>

            <button
              className="cancel-btn"
              onClick={() => {
                setShowProductModal(false);

                setSelectedCollection(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>Edit Product</h2>

            <input
              value={editProductName}
              onChange={(e) => setEditProductName(e.target.value)}
            />

            <input
              type="number"
              value={editProductPrice}
              onChange={(e) => setEditProductPrice(e.target.value)}
            />

            <textarea
              value={editProductDescription}
              onChange={(e) => setEditProductDescription(e.target.value)}
            />

            <input
              type="number"
              value={editProductStock}
              onChange={(e) => setEditProductStock(e.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleEditProductImage}
            />

            {editProductPreview && (
              <img
                src={editProductPreview}
                className="preview-image"
                alt="preview"
              />
            )}

            <button
              className="primary-btn"
              onClick={updateProduct}
              disabled={updatingProduct}
            >
              {updatingProduct ? "Updating..." : "Update Product"}
            </button>

            <button
              className="cancel-btn"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collections;
