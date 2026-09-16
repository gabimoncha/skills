def add_item(item, items=[]):
    items.append(item)
    return items


def discounted_prices(prices, rate):
    return [price * (1 - rate) for price in prices]
