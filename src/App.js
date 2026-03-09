// App.js
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const [stockData, setStockData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [physicalQuantity, setPhysicalQuantity] = useState('');
  const [isCounting, setIsCounting] = useState(false);
  const [originalHeaders, setOriginalHeaders] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Get headers and data
      const headers = jsonData[0];
      setOriginalHeaders(headers);
      
      // Check if required columns exist
      const requiredColumns = ['Article', 'Code', 'QtéSys', 'Écart', 'valÉcart'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        alert(`Missing columns: ${missingColumns.join(', ')}`);
        return;
      }

      // Convert to objects
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        obj['Quantité Physique'] = '';
        obj['subs'] = '';
        return obj;
      });

      setStockData(rows);
    };

    reader.readAsArrayBuffer(file);
  };

  const startCounting = () => {
    setIsCounting(true);
    setCurrentIndex(0);
    setPhysicalQuantity('');
  };

  const handleNext = () => {
    if (!physicalQuantity && physicalQuantity !== '0') {
      alert('Please enter a quantity');
      return;
    }

    // Update current item with physical quantity
    const updatedData = [...stockData];
    const currentItem = updatedData[currentIndex];
    
    const physicalQty = parseFloat(physicalQuantity) || 0;
    const systemQty = parseFloat(currentItem['QtéSys']) || 0;
    
    currentItem['Quantité Physique'] = physicalQuantity;
    currentItem['subs'] = physicalQty - systemQty;
    currentItem['écart'] = physicalQty - systemQty;
    
    setStockData(updatedData);

    if (currentIndex < stockData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPhysicalQuantity('');
    } else {
      setIsCounting(false);
      alert('Counting completed!');
    }
  };

  const handleSkip = () => {
    if (currentIndex < stockData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setPhysicalQuantity('');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setPhysicalQuantity(stockData[currentIndex - 1]['Quantité Physique'] || '');
    }
  };

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = stockData.map(item => ({
      ...item,
      écart: item.subs || item.écart
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Count');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportFileName = `stock_count_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, exportFileName);
  };

  const currentItem = stockData[currentIndex] || {};

  return (
    <div className="App">
      <header className="app-header">
        <h1>📦 Comptage - Stock Counting App</h1>
      </header>

      <main className="app-main">
        {!stockData.length ? (
          <div className="upload-section">
            <h2>Upload Excel File</h2>
            <p>File should contain columns: Article, Code, QtéSys, écart, valécart</p>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload}
              className="file-input"
            />
          </div>
        ) : (
          <div className="counting-section">
            <div className="file-info">
              <span>File: {fileName}</span>
              <span>Total Articles: {stockData.length}</span>
            </div>

            {!isCounting ? (
              <div className="start-section">
                <h2>Ready to start counting?</h2>
                <button onClick={startCounting} className="btn btn-primary">
                  Start Counting
                </button>
                <button onClick={exportToExcel} className="btn btn-success">
                  Export to Excel
                </button>
              </div>
            ) : (
              <div className="counting-interface">
                <div className="progress">
                  Article {currentIndex + 1} of {stockData.length}
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${((currentIndex + 1) / stockData.length) * 100}%`}}
                    ></div>
                  </div>
                </div>

                <div className="article-details">
                  <div className="detail-item">
                    <label>Article:</label>
                    <span className="value">{currentItem['Article']}</span>
                  </div>
                  <div className="detail-item">
                    <label>Code:</label>
                    <span className="value">{currentItem['Code']}</span>
                  </div>
                  <div className="detail-item">
                    <label>System Quantity:</label>
                    <span className="value system-qty">{currentItem['QtéSys']}</span>
                  </div>
                  <div className="detail-item">
                    <label>Previous écarts:</label>
                    <span className="value">{currentItem['écart']}</span>
                  </div>
                  <div className="detail-item">
                    <label>Previous valécart:</label>
                    <span className="value">{currentItem['valécart']}</span>
                  </div>
                </div>

                <div className="input-section">
                  <label htmlFor="physicalQty">Quantité Physique:</label>
                  <input
                    id="physicalQty"
                    type="number"
                    value={physicalQuantity}
                    onChange={(e) => setPhysicalQuantity(e.target.value)}
                    placeholder="Enter physical count"
                    autoFocus
                  />
                </div>

                <div className="button-group">
                  <button 
                    onClick={handlePrevious} 
                    disabled={currentIndex === 0}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="btn btn-primary"
                  >
                    {currentIndex === stockData.length - 1 ? 'Finish' : 'Next'}
                  </button>
                  <button 
                    onClick={handleSkip} 
                    className="btn btn-warning"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;