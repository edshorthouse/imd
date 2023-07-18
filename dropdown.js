document.addEventListener('DOMContentLoaded', function() {
    const dropdown = document.getElementById('dropdown');
    const csvUrl = 'https://raw.githubusercontent.com/edshorthouse/imd/94de5d303a2cac1e4b05793ca6f2bfae9d89b9df/dropdown%20ref.csv';

    // Fetch the CSV file
    fetch(csvUrl)
        .then(response => response.text())
        .then(data => {
            // Split the CSV content into an array of items
            const items = data.split('\n');

            // Populate the dropdown with options
            items.forEach(item => {
                const option = document.createElement('option');
                option.text = item.trim(); // Trim to remove any leading/trailing spaces
                dropdown.add(option);
            });
        })
        .catch(error => console.error('Error fetching the CSV file:', error));
});