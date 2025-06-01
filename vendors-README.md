# Food Vendors & Activities Guide

This document provides information on how to update the food vendors and activities data for Download Festival.

## Vendors Data Structure

The vendors data is stored in `vendors-data.json` and follows this structure:

```json
{
  "vendors": {
    "arena": [
      {
        "id": "unique-id",
        "name": "Vendor Name",
        "description": "Short description",
        "type": "food|drinks|merchandise|activity",
        "location": "arena|districtX|village|campsite",
        "locationDetail": "More specific location",
        "dietaryOptions": ["vegetarian", "vegan", "glutenfree", "dairyfree", "nutfree"],
        "menu": [
          {
            "name": "Item Name",
            "price": "£0.00",
            "description": "Item description",
            "dietary": ["vegetarian", "vegan"]
          }
        ],
        "paymentOptions": ["cash", "card"],
        "openingTimes": "00:00-00:00",
        "image": "image-name.jpg"
      }
    ],
    "districtX": [],
    "village": [],
    "campsite": []
  }
}
```

## Adding New Vendors

To add new vendors or update existing ones:

1. Open `vendors-data.json`
2. Add a new vendor object to the appropriate location array (arena, districtX, village, or campsite)
3. Make sure to include all required fields (id, name, description, type, location)
4. Save the file

## Fields Description

### Required Fields

- `id`: Unique identifier for the vendor
- `name`: Name of the vendor
- `description`: Brief description of what the vendor offers
- `type`: Type of vendor - must be one of: food, drinks, merchandise, activity
- `location`: Location within the festival - must be one of: arena, districtX, village, campsite
- `locationDetail`: More specific description of where to find the vendor

### Optional Fields

- `dietaryOptions`: Array of dietary options the vendor caters to
- `menu`: Array of menu items (for food/drink vendors)
- `products`: Array of products sold (for merchandise vendors)
- `paymentOptions`: Array of accepted payment methods
- `openingTimes`: Opening hours in format "HH:MM-HH:MM"
- `image`: Filename of vendor image (placed in assets/vendors/ folder)

### Food/Drink Menu Items

Each menu item should include:

- `name`: Name of the item
- `price`: Price in format "£0.00"
- `description`: Brief description of the item (optional)
- `dietary`: Array of dietary information for this specific item (optional)

### Merchandise Products

Each product should include:

- `name`: Name of the product
- `price`: Price in format "£0.00"

## Dietary Options

Use the following values for consistent dietary labeling:

- `vegetarian`: Vegetarian options
- `vegan`: Vegan options
- `glutenfree`: Gluten-free options
- `dairyfree`: Dairy-free options
- `nutfree`: Nut-free options

## Images

Place vendor images in an `assets/vendors/` directory and reference them by filename in the `image` field.
