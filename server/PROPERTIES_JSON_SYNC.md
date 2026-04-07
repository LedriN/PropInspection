# Properties JSON Sync System

This system automatically maintains a `properties.json` file that contains all properties from the PropInspection system. The JSON file is automatically updated whenever properties are added, edited, or deleted.

## Features

- **Automatic Sync**: Properties are automatically synced to JSON when created, updated, or deleted
- **Manual Sync**: You can manually sync all properties using the API endpoint
- **Status Check**: Check the status and contents of the JSON file
- **Error Handling**: JSON sync failures don't affect the main property operations

## File Location

The `properties.json` file is stored at: `server/data/properties.json`

## JSON Structure

```json
{
  "properties": [
    {
      "_id": "property_id",
      "name": "Property Name",
      "propertyType": "Apartment",
      "address": {
        "street": "123 Main St",
        "city": "City",
        "state": "State",
        "zipCode": "12345",
        "country": "Switzerland"
      },
      "coordinates": {
        "lat": 46.5197,
        "lng": 6.6323
      },
      "size": {
        "bedrooms": 2,
        "bathrooms": 1,
        "squareFeet": 1000
      },
      "rent_price": 1500,
      "status": "Available",
      "description": "Property description",
      "features": "Property features",
      "yearBuilt": 2020,
      "parking": "Available",
      "petFriendly": true,
      "furnished": false,
      "images": [],
      "pdf": "",
      "defects": [],
      "createdAt": "2025-10-22T07:51:15.381Z",
      "updatedAt": "2025-10-22T07:51:15.381Z"
    }
  ],
  "lastUpdated": "2025-10-22T07:51:15.381Z",
  "totalCount": 1,
  "metadata": {
    "version": "1.0",
    "description": "Properties data exported from PropInspection system"
  }
}
```

## API Endpoints

### 1. Check JSON File Status
```
GET /api/properties/json-status
```

Returns information about the JSON file including:
- Whether the file exists
- File path
- Total number of properties
- Last updated timestamp
- Metadata

### 2. Manual Sync All Properties
```
POST /api/properties/sync-json
```

Manually syncs all properties from all databases to the JSON file. Useful for:
- Initial setup
- Recovery after errors
- Bulk updates

Returns:
- Total properties synced
- Number of databases checked
- File path
- Last updated timestamp

## Automatic Operations

The following operations automatically update the JSON file:

1. **Create Property** (`POST /api/properties`)
   - Adds the new property to the JSON file

2. **Update Property** (`PUT /api/properties/:id`)
   - Updates the existing property in the JSON file

3. **Delete Property** (`DELETE /api/properties/:id`)
   - Removes the property from the JSON file

## Error Handling

- If JSON file operations fail, the main property operations continue normally
- Errors are logged to the console but don't affect the API response
- You can use the manual sync endpoint to recover from any sync issues

## Usage Examples

### Check if JSON file exists and get status
```bash
curl -X GET http://localhost:3000/api/properties/json-status
```

### Manually sync all properties
```bash
curl -X POST http://localhost:3000/api/properties/sync-json
```

### Access the JSON file directly
The file is available at: `server/data/properties.json`

## Implementation Details

- **Service**: `server/services/jsonFileService.js`
- **Integration**: `server/routes/properties.js`
- **File Location**: `server/data/properties.json`
- **Auto-creation**: The JSON file and data directory are created automatically when first accessed

## Benefits

1. **Backup**: JSON file serves as a backup of all properties
2. **Export**: Easy to export property data for external use
3. **Integration**: Can be used by other systems or scripts
4. **Monitoring**: Track changes and updates to properties
5. **Recovery**: Can restore properties from JSON if needed
