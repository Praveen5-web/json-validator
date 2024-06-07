import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-enterprise';
import 'ag-grid-enterprise/styles/ag-grid.css';
import 'ag-grid-enterprise/styles/ag-theme-alpine.css';
import './style.css'

const CustomDropdown = ({ options, onSelect }) => {
  const [selectedOption, setSelectedOption] = useState('');

  const handleSelectChange = (event) => {
    setSelectedOption(event.target.value);
    onSelect(event.target.value);
  };

  return (
    <select value={selectedOption} onChange={handleSelectChange}>
      {options.map((option, index) => (
        <option key={index} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};

const UnmatchedData = ({ data, columnDefs }) => {
  return (
    <div className="ag-theme-alpine table" style={{ height: 400, width: '100%', marginBottom: '20px' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={10}
        paginationPageSizeSelector={false}
      />
    </div>
  );
};

const App = () => {
  const [selectedFiles, setSelectedFiles] = useState([null, null, null]);
  const [processedData, setProcessedData] = useState(null);
  const [unmatchedData, setUnmatchedData] = useState([]);
  const [displayUnmatched, setDisplayUnmatched] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [namesArray, setNamesArray] = useState([]);
  const [accumulatedData, setAccumulatedData] = useState([]);
  const [List, setList] = useState([]);

  const handleFileChange = (event, index) => {
    const files = event.target.files;
    const updatedFiles = [...selectedFiles];
    updatedFiles[index] = files[0];
    setSelectedFiles(updatedFiles);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const formData = new FormData();
    selectedFiles.forEach((file, index) => {
      if (file) {
        formData.append(`file${index + 1}`, file);
      }
    });

    try {
      const response = await axios.post('http://localhost:5000/process_files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setProcessedData(response.data.matched_data);
      setUnmatchedData(response.data.unmatched_data);
      setList(response.data.names)
      const namesArray = response.data.names.map(item => item.name);
      setNamesArray(namesArray); // Corrected variable name
    } catch (error) {
      console.error('Error processing files:', error);
      setError('Error processing files. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Update UI components based on changes in processedData or unmatchedData
    if (processedData && Array.isArray(processedData)) {
      // Processed data is already set in state, update any UI components accordingly
    }
    if (unmatchedData && Array.isArray(unmatchedData)) {
      // Unmatched data is already set in state, update any UI components accordingly
    }
  }, [processedData, unmatchedData]);

  const toggleUnmatchedData = () => {
    setDisplayUnmatched(!displayUnmatched);
  };

  const unmatchedDataColumnDefs = [
    [
      { headerName: 'Workspace Name', field: 'workspace_name' },
      { headerName: 'No of User', valueGetter: (params) => params.data.user_data ? params.data.user_data.length : 0 }
    ],
    [
      { headerName: 'Workspace Domain', field: 'workspace_domain' },
      { headerName: 'No. of Dashboards', field: 'no_of_dashboards' },
      { headerName: 'No. of Reports', field: 'no_of_reports' }
    ],
    [
      { headerName: 'Workspace Domain', field: 'workspace_domain' },
      { headerName: 'Box Folder Id', field: 'box_folder_id' }
    ]
  ];

  const list = namesArray;

  const columnDefs = [
    { headerName: 'Workspace Domain', field: 'workspace_domain' },
    { headerName: 'No. of Dashboards', valueGetter: (params) => params.data.dashboards ? params.data.dashboards.length : 0 },
    { headerName: 'Workspace Name', field: 'workspace_name' },
    { headerName: 'No. of Reports', valueGetter: (params) => params.data.reports ? params.data.reports.length : 0 },
    { headerName: "No. of user's", valueGetter: (params) => params.data.user_data ? params.data.user_data.length : 0 },
    { headerName: 'Box_Folder_Id', field: 'box_folder_id' },
    {
      headerName: 'cell',
      field: 'cell',
      editable: true,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: {
        values: list,
        allowTyping: true,
        filterList: true,
        highlightMatch: true,
        valueListMaxHeight: 220
      },
      onCellValueChanged: function (params) {
        const data = params.data;
        const name = params.newValue;

        // Add error handling
        if (!data || !name) {
          console.error('Invalid data or newValue');
          return;
        }

        // Filter the List based on the selected name
        const filteredData = List.filter(item => item.name === name);

        // Modify the structure of the filtered data to match the desired format
        const modifiedFilteredData = filteredData.map(item => {
          // Find the workspace details by name
          const workspaceDetails = unmatchedData.find(workspace => workspace.workspace_name === data.workspace_name);
          return {
            id: item.id,
            is_active: item.is_active,
            name: item.name,
            project_id: item.project_id,
            rocketlane_id: item.rocketlane_id,
            box_folder_id: data.box_folder_id,
            workspace_name: data.workspace_name,
            dashboards: data.dashboards,
            reports: data.reports,
            user_data: data.user_data,
            workspace_domain: workspaceDetails ? workspaceDetails.workspace_domain : data.workspace_domain
          };
        });

        // Update the accumulatedData state with the modified filtered data
        setAccumulatedData(prevData => {
          // Check for duplicates before adding
          const newData = modifiedFilteredData.filter(newItem => {
            return !prevData.some(prevItem => prevItem.id === newItem.id);
          });
          return [...prevData, ...newData];
        });
      }
    }
  ];

  const downloadJson = (jsonData) => {
    const element = document.createElement('a');
    const file = new Blob([jsonData], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = 'final_data.json';
    document.body.appendChild(element);
    element.click();
  };

  const handleDownload = () => {
    downloadJson(JSON.stringify(accumulatedData));
  };

  return (
    <div className='container'>
      <div className='container_content'>
        <h1>JSON File Processor</h1>
        <div className='container-1'>
          <div className='file-upload'>
            <h3>clean output
              <input type="file" onChange={(e) => handleFileChange(e, 0)} />
            </h3>
          </div>
          <div className='file-upload'>
            <h3>cleaned structure data
              <input type="file" onChange={(e) => handleFileChange(e, 1)} />
            </h3>
          </div>
          <div className='file-upload'>
            <h3>Unique Josn
              <input type="file" onChange={(e) => handleFileChange(e, 2)} />
            </h3>
          </div>
          <div className='file-upload'>
            <h3>workspace file
              <input type="file" onChange={(e) => handleFileChange(e, 3)} />
            </h3>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={isLoading} className='button1'>
          {isLoading ? 'Processing...' : 'Process Files'}
        </button>
        {processedData && (
          <div>
            <h2>Matched Data:</h2>
            <input
              type="text"
              placeholder="Search Matched Data"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="ag-theme-alpine table1" style={{ height: 500, width: '100%' }}>
              <AgGridReact
                rowData={processedData.filter(item =>
                  Object.values(item).some(val =>
                    val.toString().toLowerCase().includes(searchText.toLowerCase())
                  )
                )}
                columnDefs={columnDefs}
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={false}
              />
            </div>
          </div>
        )}
        <button onClick={toggleUnmatchedData} className='button2'>
          {displayUnmatched ? 'Hide Unmatched Data' : 'Show Unmatched Data'}
        </button>
        {displayUnmatched && unmatchedData && unmatchedData.length > 0 && (
          <div>
            <h2>Unmatched Data:</h2>
            <div style={{ display: 'flex', gap: '20px' }}>
              {unmatchedData.map((data, index) => (
                <div key={index} style={{ flex: '1' }}>
                  <h3>Table {index + 1}</h3>
                  <UnmatchedData data={data} columnDefs={unmatchedDataColumnDefs[index]} />
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <div>Error: {error}</div>}
        {accumulatedData.length > 0 && (
          <button onClick={handleDownload} className='button3'>Download Final Data</button>
        )}
      </div>
    </div>
  );
};

export default App;
