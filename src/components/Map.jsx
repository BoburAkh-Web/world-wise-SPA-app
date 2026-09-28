import React, { useState } from "react";
import styles from "./Map.module.css";
import { useNavigate, useSearchParams } from "react-router-dom";
function Map() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  return (
    <div
      className={styles.mapContainer}
      onClick={() => {
        navigate("form");
      }}
    >
      <h1>Map</h1>
      <h2>
        {lat}, {lng}
      </h2>
      <button
        onClick={() => {
          setSearchParams({ lat: 23, lng: 30 });
        }}
      >
        Change position
      </button>
    </div>
  );
}

export default Map;
