def build_catalog(item, catalog=None):
    if catalog is None:
        catalog = []
    catalog.append(item)
    return catalog
