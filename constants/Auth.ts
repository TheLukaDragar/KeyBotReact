export enum UserType {
    CLIENT = "Client",
    COURIER = "Courier",
    //VEHICLE_OWNER = "Vehicle Owner",
}
export const UserTypesDescriptions = {
    [UserType.CLIENT]: 'A client is someone who requests a service.',
    [UserType.COURIER]: 'A courier is responsible for delivering goods.',
   // [UserType.VEHICLE_OWNER]: 'A vehicle owner provides a vehicle for transportation.',
};
export enum UserType2 {
    ADMIN = -1,
    PARCEL_DELIVERY = 1,
    PARCEL_RECEIVER = 2,
    RENTER = 3,
}

export enum BoxPermissionLevel {
    NONE = 0,
    OPEN = 1,
    MANAGE = 2,
    OWNER = 3
}
export enum BoxStatus {

    NOT_READY = 1,
    READY = 2,
}

  
