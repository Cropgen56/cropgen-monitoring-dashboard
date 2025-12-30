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

export default function App() {
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const [mapLocation, setMapLocation] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { farms, loading } = useSelector((state) => state.farm);


  useEffect(() => {
    if (token) {
      dispatch(getAllFields(token));
    }
  }, [token, dispatch]);

  const handleFileUpload = (fileData) => {
    console.log("App received file upload:", fileData);
    setUploadedFileData(fileData);
  };

  const handleLocationChange = (coordinates) => {
    console.log("Location changed:", coordinates);
    setMapLocation(coordinates);
  };

  const handleFieldSave = (boundaryData) => {
    console.log("Field saved:", boundaryData);
  };

  const handleSnapshotClick = (snapshot) => {
    console.log("Snapshot clicked:", snapshot);
    setSelectedSnapshot(snapshot);

    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <FieldDataProvider farms={farms}>
      <div className="min-h-screen bg-cg-bg font-sans text-sm text-white overflow-x-hidden">
        <Header />

        <div className="w-full max-w-[2000px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-8 sm:pb-12 md:pb-16">
          {/* Desktop Layout */}
          <div className="hidden lg:block">
            {/* Grid Section - Map + Dashboard + Sidebar */}
            <div className="grid lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6">
              {/* Main Content */}
              <div className="col-span-8 xl:col-span-8 2xl:col-span-9">
                <div className="mb-3 sm:mb-4">
                  <SearchBar onLocationSelect={handleLocationChange} />
                </div>

                <MapSection
                  farms={farms}
                  uploadedData={uploadedFileData}
                  externalLocation={mapLocation}
                  onLocationChange={handleLocationChange}
                  onFieldSave={handleFieldSave}
                  selectedSnapshot={selectedSnapshot}
                />

                <div className="mt-3 sm:mt-4 md:mt-6">
                  <DashboardCards />
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-span-4 xl:col-span-4 2xl:col-span-3">
                <RightSidebar
                  onFileUpload={handleFileUpload}
                  onSnapshotClick={handleSnapshotClick}
                />
              </div>
            </div>

            {/* Full-Width Section - Soil Health + Charts */}
            <div className="mt-3 sm:mt-4 md:mt-6 space-y-3 sm:space-y-4 md:space-y-6">
              <SoilHealth />
              <TimeSeriesCharts />
            </div>
          </div>

          {/* Mobile / Tablet */}
          <div className="lg:hidden space-y-3 sm:space-y-4">
            <SearchBar onLocationSelect={handleLocationChange} />

            <MapSection
              farms={farms}
              uploadedData={uploadedFileData}
              externalLocation={mapLocation}
              onLocationChange={handleLocationChange}
              onFieldSave={handleFieldSave}
              selectedSnapshot={selectedSnapshot}
            />

            <DashboardCards />
            <SoilHealth />
            <TimeSeriesCharts />

            <RightSidebar
              onFileUpload={handleFileUpload}
              onSnapshotClick={handleSnapshotClick}
            />
          </div>
        </div>
      </div>
    </FieldDataProvider>
  );
}
