import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import MapSection from "../components/MapSection";
import RightSidebar from "../components/RightSidebar";
import DashboardCards from "../components/DashboardCards";
import SoilHealth from "../components/SoilHealth";
import TimeSeriesCharts from "../components/TimeSeriesCharts";
import SearchBar from "../components/SearchBar";
import { FieldDataProvider } from "../context/FieldDataContext";
import { useDispatch, useSelector } from "react-redux";
import { getAllFields } from "../redux/slice/farmSlice";
import SelectedCropCard from "../components/dashboard/SelectedCropCard";

export default function Dashboard() {
  const [selectedCrop, setSelectedCrop] = useState("");
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [savedFields, setSavedFields] = useState([]);
  const [selectedSavedField, setSelectedSavedField] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState("");

  const selectedFieldId = selectedSavedField?.id || null;

  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { farms, loading } = useSelector((state) => state.farm);

  useEffect(() => {
    if (token) {
      dispatch(getAllFields(token));
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (!user?._id) return;

    const stored = localStorage.getItem(`savedFields_${user._id}`);
    if (stored) {
      setSavedFields(JSON.parse(stored));
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;

    localStorage.setItem(
      `savedFields_${user._id}`,
      JSON.stringify(savedFields)
    );
  }, [savedFields, user]);

  const handleFileUpload = (fileData) => {
    console.log("App received file upload:", fileData);
    setUploadedFileData(fileData);
  };

  const handleLocationChange = (coordinates) => {
    console.log("Location changed:", coordinates);
    setMapLocation(coordinates);
  };

  const handleFieldSave = (boundaryData) => {
    const now = new Date();

    const newField = {
      id: Date.now(),
      name: `Field ${now.toLocaleDateString("en-GB")}`,
      area: boundaryData.area.toFixed(2),
      points: boundaryData.points.length,
      createdAt: now.toLocaleString(),
      coordinates: boundaryData.points,
    };

    setSavedFields((prev) => [...prev, newField]);
  };

  const handleDeleteField = (id) => {
    setSavedFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSnapshotClick = (snapshot) => {
    console.log("Snapshot clicked:", snapshot);
    setSelectedSnapshot(snapshot);

    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    // <FieldDataProvider farms={farms}>
    <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-8 sm:pb-12 md:pb-16">
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="grid lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
          <div className="col-span-8 xl:col-span-8 2xl:col-span-9">
            <div className="mb-3 sm:mb-4">
              <SearchBar onLocationSelect={handleLocationChange} />
            </div>

            <MapSection
              farms={farms}
              selectedCrop={selectedCrop}
              externalLocation={mapLocation}
              onFieldSave={handleFieldSave}
              savedFields={savedFields}
              selectedSavedField={selectedSavedField}
              selectedCountry={selectedCountry}

              // uploadedData={uploadedFileData}
              // onLocationChange={handleLocationChange}
              // onFieldSave={handleFieldSave}
              // selectedSnapshot={selectedSnapshot}
            />

            <div className="mt-3 sm:mt-4 md:mt-6">
              <DashboardCards selectedCrop={selectedCrop} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 xl:col-span-4 2xl:col-span-3">
            <RightSidebar
              farms={farms}
              selectedCrop={selectedCrop}
              onCropChange={setSelectedCrop}
              savedFields={savedFields}
              onDeleteField={handleDeleteField}
              onSelectField={setSelectedSavedField}
              selectedFieldId={selectedFieldId}
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              onFileUpload={handleFileUpload}
              onSnapshotClick={handleSnapshotClick}
            />
          </div>
        </div>

        <div className="mt-3 sm:mt-4 md:mt-6 space-y-3 sm:space-y-4 md:space-y-6">
          <SelectedCropCard
            farms={farms}
            selectedCrop={selectedCrop}
            selectedField={selectedSavedField}
          />

          <SoilHealth
            selectedCrop={selectedCrop}
            onCropChange={setSelectedCrop}
          />
          {selectedCrop && <TimeSeriesCharts selectedCrop={selectedCrop} />}
        </div>
      </div>

      {/* Mobile / Tablet */}
      <div className="lg:hidden space-y-3 sm:space-y-4">
        <SearchBar onLocationSelect={handleLocationChange} />

        <MapSection
          farms={farms}
          selectedCrop={selectedCrop}
          externalLocation={mapLocation}
          onFieldSave={handleFieldSave}
          savedFields={savedFields}
          selectedSavedField={selectedSavedField}
          selectedCountry={selectedCountry}

          // uploadedData={uploadedFileData}
          // onLocationChange={handleLocationChange}
          // onFieldSave={handleFieldSave}
          // selectedSnapshot={selectedSnapshot}
        />

        <DashboardCards selectedCrop={selectedCrop} />
        <RightSidebar
          farms={farms}
          selectedCrop={selectedCrop}
          onCropChange={setSelectedCrop}
          savedFields={savedFields}
          onDeleteField={handleDeleteField}
          onSelectField={setSelectedSavedField}
          selectedFieldId={selectedFieldId}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          onFileUpload={handleFileUpload}
          onSnapshotClick={handleSnapshotClick}
        />
        <SelectedCropCard
          farms={farms}
          selectedCrop={selectedCrop}
          selectedField={selectedSavedField}
        />

        <SoilHealth
          selectedCrop={selectedCrop}
          onCropChange={setSelectedCrop}
        />
        {selectedCrop && <TimeSeriesCharts selectedCrop={selectedCrop} />}
      </div>
    </div>
    // </FieldDataProvider>
  );
}
