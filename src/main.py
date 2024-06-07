from flask import Flask, request, jsonify, send_file
import json
from flask_cors import CORS
import os
from collections import defaultdict

app = Flask(__name__)
CORS(app)

@app.route('/process_files', methods=['POST'])
def process_files():
    matched_data = []
    unmatched_data = []
    table2 = []

    
    # Retrieve input files from request
    file1 = request.files.get('file1')
    file2 = request.files.get('file2')
    file3 = request.files.get('file3')
    file4 = request.files.get('file4')

    # Check if all files are provided
    if not all([file1, file2, file3]):
        return jsonify({'error': 'All input files are required.'}), 400

    # Load data from the first JSON file if it exists
    data1 = json.load(file1) if file1 else []

    # Load data from the second JSON file if it exists
    data2 = json.load(file2) if file2 else []

    # Load data from the third JSON file if it exists
    data3 = json.load(file3) if file3 else []

    workspaces_data = json.load(file4) if file4 else []

    # Extract workspace domains from data2
    workspace_domains_data2 = {entry.get('workspace_domain') for entry in data2 if isinstance(entry, dict)}

    # Create a dictionary to store box_folder_id for each workspace from data3
    box_folder_ids = {entry.get('workspace_domain', entry.get('workspace_name', '')): entry.get('box_folder_id', "N/A") for entry in data3}

    # Initialize a dictionary to store workspace data
    workspace_data = defaultdict(dict)

    # Process data from the first JSON file
    for entry1 in data1:
        if isinstance(entry1, dict):
            workspace_name = entry1.get('workspace_name')
            # Check if the workspace domain exists in data2
            if workspace_name in workspace_domains_data2:
                # If a match is found, append data to workspace_data
                email = entry1.get('email')
                name = entry1.get('name')
                user_data = {'email': email, 'name': name}
                # workspace_data[workspace_name].setdefault('email', []).append(email)
                workspace_data[workspace_name].setdefault('user_data', []).append(user_data)
                # workspace_data[workspace_name].setdefault('name', []).append(name)
                workspace_data[workspace_name]['workspace_name'] = workspace_name

    # Process data from the second JSON file
    workspace_domains_data3 = {entry.get('workspace_domain') for entry in data3 if isinstance(entry, dict)}

    for entry2 in data2:
     if isinstance(entry2, dict):
        workspace_domain = entry2.get('workspace_domain')
        dashboards = entry2.get('dashboards')
        reports = entry2.get('reports')
        
        if workspace_domain and dashboards and reports:
            # Check if the workspace_domain is in the workspace_domains_data3 set
            if workspace_domain in workspace_domains_data3:
                # If the workspace_domain is found in data3, add it to matched_data
                workspace_data[workspace_domain].setdefault('dashboards', []).extend(dashboards)
                workspace_data[workspace_domain].setdefault('reports', []).extend(reports)
                
    for entry3 in data3:
     if isinstance(entry3, dict):
        workspace_domain = entry3.get('workspace_domain', entry3.get('workspace_name', ''))
        box_folder_id = entry3.get('box_folder_id', "N/A")
        
        # Check if the workspace_domain exists in workspace_domains_data2
        if workspace_domain in workspace_domains_data2:
            # Update workspace_data with box_folder_id
            workspace_data[workspace_domain]['box_folder_id'] = box_folder_id
    # Convert workspace_data to a list of dictionaries
    matched_data = [{'workspace_domain': workspace_domain, **data} for workspace_domain, data in workspace_data.items()]

    # Write matched data to a JSON file
    with open("matched_data.json", 'w') as output_file:
        json.dump(matched_data, output_file)

    if data1:
        unmatched_data_1 = {}
        for entry1 in data1:
            if isinstance(entry1, dict):
                workspace_name = entry1.get('workspace_name')
                email = entry1.get('email')
                name = entry1.get('name')
                if workspace_name not in workspace_domains_data2:
                        if workspace_name in unmatched_data_1:
                            unmatched_data_1[workspace_name]['user_data'].append({'email': email, 'name': name})
                        else:
                            # If the workspace is not in unmatched_data_1, create a new entry
                            unmatched_data_1[workspace_name] = {
                                'workspace_name': workspace_name,
                                'user_data': [{'email': email, 'name': name}]
                            }

        # with open("unmatched_data_1.json", 'w') as output_file:
            # json.dump(list(unmatched_data_1.values()), output_file)

        unmatched_data.append(list(unmatched_data_1.values()))
        
    if data2:
     for entry in data2:
        if isinstance(entry, dict):
            workspace_domain = entry.get('workspace_domain')
            dashboards = entry.get('dashboards')
            reports = entry.get('reports')
            if workspace_domain and dashboards and reports:
                # Check if the workspace_domain is in the matched_data
                matched_workspace = next((data for data in matched_data if data['workspace_domain'] == workspace_domain), None)
                if matched_workspace:
                    # If the workspace is found in matched_data, skip adding it to unmatched_data
                    continue
                unmatched_entry = {
                    'workspace_domain': workspace_domain,
                    'no_of_dashboards': len(dashboards),
                    'no_of_reports': len(reports)
                }
                table2.append(unmatched_entry)
    unmatched_data.append(table2)

    if data3:
        unmatched_data_3 = []
        for entry3 in data3:
            if isinstance(entry3, dict):
                workspace_domain = entry3.get('workspace_domain', entry3.get('workspace_name', ''))
                box_folder_id = entry3.get('box_folder_id', "N/A")
                # Check if the workspace_domain and box_folder_id combination is in the matched_data
                matched_workspace = next((data for data in matched_data if data.get('box_folder_id') == box_folder_id), None)
                if not matched_workspace:
                    # If the workspace is not found in matched_data, add it to unmatched_data_3
                    unmatched_data_3.append(entry3)

        # Write unmatched_data_3 to a JSON file
        # with open("unmatched_data_3.json", 'w') as output_file:
            # json.dump(unmatched_data_3, output_file)
        
        # Append unmatched_data_3 to unmatched_data
        unmatched_data.append(unmatched_data_3)


    return jsonify({
        'matched_data': matched_data,
        'unmatched_data_files': ['unmatched_data_1.json', 'unmatched_data_2.json', 'unmatched_data_3.json'],
        'unmatched_data': unmatched_data,
        'names': workspaces_data
    })

@app.route('/download_matched_data')
def download_matched_data():
    return send_file('matched_data.json', as_attachment=True)

@app.route('/download_unmatched_data/<file_number>')
def download_unmatched_data(file_number):
    filename = f"unmatched_data_{file_number}.json"
    file_path = os.path.join(app.root_path, filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    return send_file(
        file_path,
        mimetype='application/json',
        as_attachment=True,
        attachment_filename=filename
    )

if __name__ == '__main__':
    app.run(debug=True)
