export interface LessThanScan<ItemType> {
    fieldName: keyof ItemType;
    lessThanValue:  string | number;
}

export interface GenericScan<ItemType> {
    filterString?: string;
    attributeValues?: any;
}
