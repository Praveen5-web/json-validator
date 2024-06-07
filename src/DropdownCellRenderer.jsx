import React, { useEffect, useRef } from 'react';
import $ from 'jquery';
import 'select2';

const DropdownCellRenderer = ({ value, setValue, rowData }) => {
  const selectRef = useRef(null);

  useEffect(() => {
    $(selectRef.current).select2({
      width: '100%',
      dropdownAutoWidth: true, // Adjust the dropdown width automatically
      data: rowData.map(item => ({ id: item.make, text: item.make })),
      placeholder: 'Search...', // Add a placeholder for the search box
      allowClear: true, // Allow clearing the selected value
    });

    // Event listener for value change
    $(selectRef.current).on('change', (e) => {
      setValue(e.target.value);
    });

    // Cleanup on unmount
    return () => {
      $(selectRef.current).select2('destroy');
    };
  }, []); // Run only once on mount

  useEffect(() => {
    // Set the initial value
    $(selectRef.current).val(value).trigger('change.select2');
  }, [value]); // Run whenever the value changes

  return <select ref={selectRef} />;
};

export default DropdownCellRenderer;
