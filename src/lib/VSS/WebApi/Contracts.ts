/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
* 
* ---------------------------------------------------------
* Generated file, DO NOT EDIT
* ---------------------------------------------------------
*
* See following wiki page for instructions on how to regenerate:
*   https://vsowiki.com/index.php?title=Rest_Client_Generation
*/

"use strict";


/**
 * Information about the location of a REST API resource
 */
export interface ApiResourceLocation {
    /**
     * Area name for this resource
     */
    area: string;
    /**
     * Unique Identifier for this location
     */
    id: string;
    /**
     * Maximum api version that this resource supports (current server version for this resource)
     */
    maxVersion: string;
    /**
     * Minimum api version that this resource supports
     */
    minVersion: string;
    /**
     * The latest version of this resource location that is in "Release" (non-preview) mode
     */
    releasedVersion: string;
    /**
     * Resource name
     */
    resourceName: string;
    /**
     * The current resource version supported by this resource location
     */
    resourceVersion: number;
    /**
     * This location's route template (templated relative path)
     */
    routeTemplate: string;
}

/**
 * Represents version information for a REST Api resource
 */
export interface ApiResourceVersion {
    /**
     * String representation of the Public API version. This is the version that the public sees and is used for a large group of services (e.g. the TFS 1.0 API)
     */
    apiVersion: string;
    /**
     * Is the public API version in preview
     */
    isPreview: boolean;
    /**
     * Internal resource version. This is defined per-resource and is used to support build-to-build compatibility of API changes within a given (in-preview) public api version. For example, within the TFS 1.0 API release cycle, while it is still in preview, a resource's data structure may be changed. This resource can be versioned such that older clients will still work (requests will be sent to the older version) and new/upgraded clients will talk to the new version of the resource.
     */
    resourceVersion: number;
}

export enum ConnectOptions {
    /**
     * Retrieve no optional data.
     */
    None = 0,
    /**
     * Includes information about AccessMappings and ServiceDefinitions.
     */
    IncludeServices = 1,
}

export interface IdentityRef {
    displayName: string;
    id: string;
    imageUrl: string;
    isAadIdentity: boolean;
    isContainer: boolean;
    profileUrl: string;
    uniqueName: string;
    url: string;
}

/**
 * The JSON model for JSON Patch Operations
 */
export interface JsonPatchDocument {
}

/**
 * The JSON model for a JSON Patch operation
 */
export interface JsonPatchOperation {
    /**
     * The path to copy from for the Move/Copy operation.
     */
    from: string;
    /**
     * The patch operation
     */
    op: Operation;
    /**
     * The path for the operation
     */
    path: string;
    /**
     * The value for the operation. This is either a primitive or a JToken.
     */
    value: any;
}

export interface JsonWebToken {
}

export enum JWTAlgorithm {
    None = 0,
    HS256 = 1,
    RS256 = 2,
}

export enum Operation {
    Add = 0,
    Remove = 1,
    Replace = 2,
    Move = 3,
    Copy = 4,
    Test = 5,
}

export interface Publisher {
    /**
     * Name of the publishing service.
     */
    name: string;
    /**
     * Service Owner Guid Eg. Tfs : 00025394-6065-48CA-87D9-7F5672854EF7
     */
    serviceOwnerId: string;
}

/**
 * The class to represent a REST reference link.  Example: { self: { href: "http://localhost:8080/tfs/DefaultCollection/_apis/wit/workItems/1" } }  RFC: http://tools.ietf.org/html/draft-kelly-json-hal-06  The RFC is not fully implemented, additional properties are allowed on the reference link but as of yet we don't have a need for them.
 */
export interface ReferenceLink {
    href: string;
}

export interface ResourceRef {
    id: string;
    url: string;
}

export interface ServiceEvent {
    /**
     * This is the id of the type. Constants that will be used by subscribers to identify/filter events being published on a topic.
     */
    eventType: string;
    /**
     * This is the service that published this event.
     */
    publisher: Publisher;
    /**
     * The resource object that carries specific information about the event. The object must have the ServiceEventObject applied for serialization/deserialization to work.
     */
    resource: any;
    /**
     * This dictionary carries the context descriptors along with their ids.
     */
    resourceContainers: { [key: string] : any; };
    /**
     * This is the version of the resource.
     */
    resourceVersion: string;
}

export interface VssJsonCollectionWrapper extends VssJsonCollectionWrapperBase {
    value: any[];
}

/**
 * This class is used to serialized collections as a single JSON object on the wire, to avoid serializing JSON arrays directly to the client, which can be a security hole
 */
export interface VssJsonCollectionWrapperV<T> extends VssJsonCollectionWrapperBase {
    value: T;
}

export interface VssJsonCollectionWrapperBase {
    count: number;
}

export interface WrappedException {
    customProperties: { [key: string] : any; };
    errorCode: number;
    eventId: number;
    helpLink: string;
    innerException: WrappedException;
    message: string;
    stackTrace: string;
    typeKey: string;
    typeName: string;
}

export var TypeInfo = {
    ApiResourceLocation: {
        fields: <any>null
    },
    ApiResourceVersion: {
        fields: <any>null
    },
    ConnectOptions: {
        enumValues: {
            "none": 0,
            "includeServices": 1,
        }
    },
    IdentityRef: {
        fields: <any>null
    },
    JsonPatchDocument: {
        fields: <any>null
    },
    JsonPatchOperation: {
        fields: <any>null
    },
    JsonWebToken: {
        fields: <any>null
    },
    JWTAlgorithm: {
        enumValues: {
            "none": 0,
            "hS256": 1,
            "rS256": 2,
        }
    },
    Operation: {
        enumValues: {
            "add": 0,
            "remove": 1,
            "replace": 2,
            "move": 3,
            "copy": 4,
            "test": 5,
        }
    },
    Publisher: {
        fields: <any>null
    },
    ReferenceLink: {
        fields: <any>null
    },
    ResourceRef: {
        fields: <any>null
    },
    ServiceEvent: {
        fields: <any>null
    },
    VssJsonCollectionWrapper: {
        fields: <any>null
    },
    VssJsonCollectionWrapperV: {
        fields: <any>null
    },
    VssJsonCollectionWrapperBase: {
        fields: <any>null
    },
    WrappedException: {
        fields: <any>null
    },
};

TypeInfo.ApiResourceLocation.fields = {
};

TypeInfo.ApiResourceVersion.fields = {
};

TypeInfo.IdentityRef.fields = {
};

TypeInfo.JsonPatchDocument.fields = {
};

TypeInfo.JsonPatchOperation.fields = {
    op: {
        enumType: TypeInfo.Operation
    },
};

TypeInfo.JsonWebToken.fields = {
};

TypeInfo.Publisher.fields = {
};

TypeInfo.ReferenceLink.fields = {
};

TypeInfo.ResourceRef.fields = {
};

TypeInfo.ServiceEvent.fields = {
    publisher: {
        typeInfo: TypeInfo.Publisher
    },
};

TypeInfo.VssJsonCollectionWrapper.fields = {
};

TypeInfo.VssJsonCollectionWrapperV.fields = {
};

TypeInfo.VssJsonCollectionWrapperBase.fields = {
};

TypeInfo.WrappedException.fields = {
    innerException: {
        typeInfo: TypeInfo.WrappedException
    },
};
