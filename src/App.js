// App.js
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [physicalQuantity, setPhysicalQuantity] = useState('');
  const [isCounting, setIsCounting] = useState(false);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'count'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceList, setPriceList] = useState([]);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    counted: 0,
    remaining: 0,
    totalValue: 0
  });

  // Load price list from Excel
  const handlePriceListUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0];
      const rows = jsonData.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setPriceList(rows);
      alert('Price list loaded successfully!');
    };

    reader.readAsArrayBuffer(file);
  };

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
      const requiredColumns = ['Article', 'Code', 'QtéSys', 'Écart', 'ValÉcart'];
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
        obj['counted'] = false;
        obj['price'] = '';
        obj['valécart_calc'] = '';
        return obj;
      });

      setStockData(rows);
      setFilteredData(rows);
      updateStats(rows);
    };

    reader.readAsArrayBuffer(file);
  };

  const updateStats = (data) => {
    const counted = data.filter(item => item.counted).length;
    const totalValue = data.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const subs = parseFloat(item.subs) || 0;
      return sum + (price * Math.abs(subs));
    }, 0);

    setStats({
      total: data.length,
      counted: counted,
      remaining: data.length - counted,
      totalValue: totalValue
    });
  };

  const getProductPrice = (article, code) => {
    const priceItem = priceList.find(p => 
      p['Article'] === article || p['Code'] === code
    );
    return priceItem ? priceItem['Prix'] || priceItem['Price'] || '' : '';
  };

  const startCounting = (index = 0) => {
    setCurrentIndex(index);
    setSelectedProduct(filteredData[index]);
    setPhysicalQuantity(filteredData[index]['Quantité Physique'] || '');
    setIsCounting(true);
    setViewMode('count');
  };

  const handleProductSelect = (product, index) => {
    setSelectedProduct(product);
    setCurrentIndex(index);
    setPhysicalQuantity(product['Quantité Physique'] || '');
    setIsCounting(true);
    setViewMode('count');
  };

  const handleSaveCount = () => {
    if (!physicalQuantity && physicalQuantity !== '0') {
      alert('Please enter a quantity');
      return;
    }

    const updatedData = [...stockData];
    const dataIndex = stockData.findIndex(item => 
      item['Article'] === selectedProduct['Article'] && 
      item['Code'] === selectedProduct['Code']
    );

    if (dataIndex !== -1) {
      const currentItem = updatedData[dataIndex];
      const physicalQty = parseFloat(physicalQuantity) || 0;
      const systemQty = parseFloat(currentItem['QtéSys']) || 0;
      const price = getProductPrice(currentItem['Article'], currentItem['Code']);
      
      currentItem['Quantité Physique'] = physicalQuantity;
      currentItem['subs'] = physicalQty - systemQty;
      currentItem['écart'] = physicalQty - systemQty;
      currentItem['price'] = price;
      currentItem['valécart_calc'] = (physicalQty - systemQty) * (parseFloat(price) || 0);
      currentItem['counted'] = true;

      setStockData(updatedData);
      updateStats(updatedData);
      
      // Update filtered data
      const newFilteredData = applyFilters(updatedData);
      setFilteredData(newFilteredData);
    }

    setPhysicalQuantity('');
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
  };

  const handleCancelCount = () => {
    setSelectedProduct(null);
    setIsCounting(false);
    setViewMode('list');
    setPhysicalQuantity('');
  };

  const applyFilters = (data) => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        (item['Article'] && item['Article'].toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item['Code'] && item['Code'].toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    switch(filterType) {
      case 'counted':
        filtered = filtered.filter(item => item.counted);
        break;
      case 'uncounted':
        filtered = filtered.filter(item => !item.counted);
        break;
      default:
        break;
    }

    return filtered;
  };

  useEffect(() => {
    const filtered = applyFilters(stockData);
    setFilteredData(filtered);
  }, [searchTerm, filterType, stockData]);

  const exportToExcel = () => {
    // Prepare data for export with all original columns plus new ones
    const exportData = stockData.map(item => {
      const newItem = { ...item };
      // Remove internal tracking fields
      delete newItem.counted;
      return newItem;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Count');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportFileName = `stock_count_completed_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, exportFileName);
  };

  const exportPriceList = () => {
    if (priceList.length > 0) {
      const ws = XLSX.utils.json_to_sheet(priceList);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Price List');
      XLSX.writeFile(wb, 'price_list.xlsx');
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📦 Comptage Pro - Stock Counting App</h1>
      </header>

      <main className="app-main">
        {!stockData.length ? (
          <div className="upload-section">
            <h2>Upload Files</h2>
            
            <div className="upload-group">
              <h3>1. Stock File (Required)</h3>
              <p>Columns: Article, Code, QtéSys, Écart, ValÉcart</p>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
                className="file-input"
              />
            </div>

            <div className="upload-group">
              <h3>2. Price List (Optional)</h3>
              <p>Upload file with product prices for valécart calculation</p>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handlePriceListUpload}
                className="file-input"
              />
              {priceList.length > 0 && (
                <div className="price-list-info">
                  <span>✅ {priceList.length} prices loaded</span>
                  <button onClick={exportPriceList} className="btn btn-small">
                    View Price List
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="dashboard">
            <div className="dashboard-header">
              <div className="file-info">
                <span>File: {fileName}</span>
                <span>Total Articles: {stats.total}</span>
                <span>Counted: {stats.counted}</span>
                <span>Remaining: {stats.remaining}</span>
                <span>Total Value: {stats.totalValue.toFixed(2)}</span>
              </div>

              <div className="dashboard-actions">
                <button onClick={exportToExcel} className="btn btn-success">
                  Export Complete Stock
                </button>
                {priceList.length > 0 && (
                  <button onClick={exportPriceList} className="btn btn-info">
                    Export Price List
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="list-view">
                <div className="list-controls">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search by Article or Code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-buttons">
                    <button 
                      className={`btn btn-filter ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterType('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'uncounted' ? 'active' : ''}`}
                      onClick={() => setFilterType('uncounted')}
                    >
                      Uncounted
                    </button>
                    <button 
                      className={`btn btn-filter ${filterType === 'counted' ? 'active' : ''}`}
                      onClick={() => setFilterType('counted')}
                    >
                      Counted
                    </button>
                  </div>
                </div>

                <div className="products-grid">
                  {filteredData.map((item, index) => (
                    <div 
                      key={index} 
                      className={`product-card ${item.counted ? 'counted' : ''}`}
                      onClick={() => handleProductSelect(item, index)}
                    >
                      <div className="product-header">
                        <span className="product-code">{item['Code']}</span>
                        {item.counted && <span className="badge">✓ Counted</span>}
                      </div>
                      <div className="product-body">
                        <div className="product-article">{item['Article']}</div>
                        <div className="product-details">
                          <span>System: {item['QtéSys']}</span>
                          {item.counted && (
                            <span>Physical: {item['Quantité Physique']}</span>
                          )}
                        </div>
                        {item.price && (
                          <div className="product-price">Price: {item.price}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredData.length === 0 && (
                  <div className="no-results">
                    No products found matching your criteria
                  </div>
                )}
              </div>
            ) : (
              <div className="count-view">
                <div className="count-header">
                  <button onClick={handleCancelCount} className="btn btn-secondary">
                    ← Back to List
                  </button>
                  <h2>Counting Product {currentIndex + 1} of {filteredData.length}</h2>
                </div>

                {selectedProduct && (
                  <div className="counting-interface">
                    <div className="article-details">
                      <div className="detail-item">
                        <label>Article:</label>
                        <span className="value">{selectedProduct['Article']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Code:</label>
                        <span className="value">{selectedProduct['Code']}</span>
                      </div>
                      <div className="detail-item">
                        <label>System Quantity:</label>
                        <span className="value system-qty">{selectedProduct['QtéSys']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Previous écarts:</label>
                        <span className="value">{selectedProduct['écart']}</span>
                      </div>
                      <div className="detail-item">
                        <label>Previous valécart:</label>
                        <span className="value">{selectedProduct['valécart']}</span>
                      </div>
                      {getProductPrice(selectedProduct['Article'], selectedProduct['Code']) && (
                        <div className="detail-item">
                          <label>Price:</label>
                          <span className="value price">
                            {getProductPrice(selectedProduct['Article'], selectedProduct['Code'])}
                          </span>
                        </div>
                      )}
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
                      <button onClick={handleSaveCount} className="btn btn-primary btn-large">
                        Save Count
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;