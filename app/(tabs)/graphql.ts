export const LIST_EVENTS = `
  query ListEvents {
    listEvents {
      id
      status
      message
      location
      timestamp
    }
  }
`;

export const ADD_EVENT = `
  mutation AddEvent($status: String!, $message: String!, $location: String!) {
    addEvent(status: $status, message: $message, location: $location) {
      id
      status
      message
      location
      timestamp
    }
  }
`;

export const SUBSCRIBE_EVENTS = `
  subscription OnEventAdded {
    onEventAdded {
      id
      status
      message
      location
      timestamp
    }
  }
`;