def preview_addition(values, item):
    """Return the original snapshot and the updated values."""
    original = values
    updated = values
    updated.append(item)
    return original, updated
