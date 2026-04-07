/**
 * Utility functions for handling address objects from the backend
 */

export interface AddressObject {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

/**
 * Converts an address object or string to a displayable string
 * @param address - Can be a string or an address object
 * @returns Formatted address string
 */
export const formatAddress = (address: string | AddressObject | undefined | null): string => {
  if (!address) return '';
  
  // If it's already a string, return it
  if (typeof address === 'string') {
    return address;
  }
  
  // If it's an object, format it
  if (typeof address === 'object') {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean); // Remove empty/undefined values
    
    return parts.join(' ').trim();
  }
  
  return '';
};

/**
 * Gets a property name from various possible formats
 * @param property - Property object that might have different address formats
 * @returns Formatted property name/address
 */
export const getPropertyName = (property: any): string => {
  if (!property) return 'Property';
  
  // Try different possible address fields
  const possibleAddresses = [
    property.address,
    property.street,
    property.name,
    property.propertyName
  ];
  
  for (const addr of possibleAddresses) {
    const formatted = formatAddress(addr);
    if (formatted) {
      return formatted;
    }
  }
  
  return 'Property';
};

/**
 * Gets a client name from various possible formats
 * @param client - Client object that might have different name formats
 * @returns Formatted client name
 */
export const getClientName = (client: any): string => {
  if (!client) return 'Client';
  
  // Try different possible name fields
  if (client.name) return client.name;
  
  if (client.firstName || client.lastName) {
    return `${client.firstName || ''} ${client.lastName || ''}`.trim();
  }
  
  return 'Client';
};
