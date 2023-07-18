document.addEventListener('DOMContentLoaded', function() {
    const dropdown = document.getElementById('dropdown');

    // Fetch the CSV file
    fetch('dropdown ref.csv')
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