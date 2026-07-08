import React from "react";
import { useParams } from "react-router-dom";
import "../styles/Products.css";

const Products = () => {

  const { collectionId } = useParams();

  return (

    <div className="admin-content">

      <div className="products-header">

        <div>

          <h1>Products</h1>

          <p>
            Collection : {collectionId}
          </p>

        </div>

        <button className="add-product-btn">
          + Add Product
        </button>

      </div>

      <div className="products-card">

        <h3>No Products Yet</h3>

      </div>

    </div>

  );

};

export default Products;