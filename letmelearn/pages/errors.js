/**
 * Error Documentation Page
 *
 * Displays human-friendly descriptions of all RFC 7807 Problem Types.
 * Each error type has a fragment identifier that can be linked to directly.
 */

Vue.component("ErrorType", {
  props: {
    type: {
      type: Object,
      required: true
    }
  },
  template: `
    <v-card :id="type.id" style="margin-bottom: 16px;">
      <v-card-title>
        <v-chip :color="statusColor" text-color="white" small>{{ type.status }}</v-chip>
        <span style="margin-left: 12px;">{{ type.title }}</span>
      </v-card-title>
      <v-card-text>
        <p><strong>Type:</strong> <code>{{ type.type }}</code></p>
        <p style="margin-top: 8px;">{{ type.description }}</p>
        <div v-if="type.example" style="margin-top: 16px; background: #f5f5f5; padding: 12px; border-radius: 4px;">
          <strong>Example:</strong>
          <pre style="margin: 8px 0 0 0; white-space: pre-wrap;">{{ type.example | json }}</pre>
        </div>
      </v-card-text>
    </v-card>
  `,
  computed: {
    statusColor: function() {
      var s = this.type.status;
      if (s >= 500) return "error";
      if (s >= 400) return "warning";
      return "info";
    }
  },
  filters: {
    json: function(obj) {
      return JSON.stringify(obj, null, 2);
    }
  }
});

var ErrorsPage = {
  template: `
<ProtectedPage title="Error Documentation" icon="error_outline">
  <v-container>
    <v-card style="margin-bottom: 24px;">
      <v-card-title>
        <h2>RFC 7807 Problem Details</h2>
      </v-card-title>
      <v-card-text>
        <p>
          This page documents all error types used in the LetMeLearn API.
          Each error follows the <a href="https://tools.ietf.org/html/rfc7807" target="_blank">RFC 7807</a>
          Problem Details format.
        </p>
        <p style="margin-top: 12px;">
          Error responses include a <code>type</code> field that links to this page with a fragment identifier,
          allowing clients to programmatically identify and handle specific error conditions.
        </p>
        <h3 style="margin-top: 24px;">Response Format</h3>
        <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-top: 8px;">{
  "type": "/errors#not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "The requested resource could not be found."
}</pre>
      </v-card-text>
    </v-card>

    <h2 style="margin-bottom: 16px;">4xx Client Errors</h2>
    <ErrorType v-for="error in clientErrors" :key="error.id" :type="error"/>

    <h2 style="margin: 24px 0 16px 0;">Business Rule Errors</h2>
    <ErrorType v-for="error in businessErrors" :key="error.id" :type="error"/>

    <h2 style="margin: 24px 0 16px 0;">5xx Server Errors</h2>
    <ErrorType v-for="error in serverErrors" :key="error.id" :type="error"/>
  </v-container>
</ProtectedPage>
`,
  navigation: {
    section: "info",
    icon: "error_outline",
    text: "Errors",
    path: "/errors",
    index: 98
  },
  data: function() {
    return {
      errors: [
        {
          id: "bad-request",
          type: "/errors#bad-request",
          title: "Bad Request",
          status: 400,
          description: "The request could not be understood by the server due to malformed syntax. Check your request body and parameters.",
          example: {
            type: "/errors#bad-request",
            title: "Bad Request",
            status: 400,
            detail: "Invalid JSON in request body"
          }
        },
        {
          id: "unauthorized",
          type: "/errors#unauthorized",
          title: "Unauthorized",
          status: 401,
          description: "Authentication is required to access this resource. Please log in and try again.",
          example: {
            type: "/errors#unauthorized",
            title: "Unauthorized",
            status: 401,
            detail: "Authentication required"
          }
        },
        {
          id: "forbidden",
          type: "/errors#forbidden",
          title: "Forbidden",
          status: 403,
          description: "You do not have permission to access this resource. This may occur if you try to access another user's data.",
          example: {
            type: "/errors#forbidden",
            title: "Forbidden",
            status: 403,
            detail: "You do not have permission to access this resource"
          }
        },
        {
          id: "not-found",
          type: "/errors#not-found",
          title: "Not Found",
          status: 404,
          description: "The requested resource could not be found. Check the URL and resource ID.",
          example: {
            type: "/errors#not-found",
            title: "Not Found",
            status: 404,
            detail: "The requested topic does not exist"
          }
        },
        {
          id: "method-not-allowed",
          type: "/errors#method-not-allowed",
          title: "Method Not Allowed",
          status: 405,
          description: "The HTTP method is not allowed for this resource. For example, trying to POST to a GET-only endpoint.",
          example: {
            type: "/errors#method-not-allowed",
            title: "Method Not Allowed",
            status: 405,
            detail: "POST method not allowed for this endpoint"
          }
        },
        {
          id: "conflict",
          type: "/errors#conflict",
          title: "Conflict",
          status: 409,
          description: "The request conflicts with the current state of the resource. Common causes include duplicate names or IDs.",
          example: {
            type: "/errors#conflict",
            title: "Conflict",
            status: 409,
            detail: "A topic with this name already exists"
          }
        },
        {
          id: "unprocessable-entity",
          type: "/errors#unprocessable-entity",
          title: "Unprocessable Entity",
          status: 422,
          description: "The request was well-formed but could not be processed due to semantic errors. Check validation rules.",
          example: {
            type: "/errors#unprocessable-entity",
            title: "Unprocessable Entity",
            status: 422,
            detail: "Email format is invalid"
          }
        },
        {
          id: "self-follow",
          type: "/errors#self-follow",
          title: "Cannot Follow Self",
          status: 422,
          description: "You cannot follow yourself. This operation is not allowed.",
          example: {
            type: "/errors#self-follow",
            title: "Cannot Follow Self",
            status: 422,
            detail: "Users cannot follow themselves"
          }
        },
        {
          id: "user-not-found",
          type: "/errors#user-not-found",
          title: "User Not Found",
          status: 404,
          description: "The specified user could not be found in the system. Verify the email address is correct.",
          example: {
            type: "/errors#user-not-found",
            title: "User Not Found",
            status: 404,
            detail: "User 'unknown@example.com' not found"
          }
        },
        {
          id: "session-not-found",
          type: "/errors#session-not-found",
          title: "Session Not Found",
          status: 404,
          description: "The specified session could not be found or does not belong to you. It may have expired or been deleted.",
          example: {
            type: "/errors#session-not-found",
            title: "Session Not Found",
            status: 404,
            detail: "Session 'abc123' not found"
          }
        },
        {
          id: "invalid-session",
          type: "/errors#invalid-session",
          title: "Invalid Session",
          status: 422,
          description: "The session ID format is invalid. Session IDs must be valid MongoDB ObjectIds.",
          example: {
            type: "/errors#invalid-session",
            title: "Invalid Session",
            status: 422,
            detail: "Invalid session ID format"
          }
        },
        {
          id: "duplicate-name",
          type: "/errors#duplicate-name",
          title: "Duplicate Name",
          status: 409,
          description: "A resource with this name already exists. Please choose a different name or modify the existing one.",
          example: {
            type: "/errors#duplicate-name",
            title: "Duplicate Name",
            status: 409,
            detail: "A topic named 'My Topic' already exists"
          }
        },
        {
          id: "internal-error",
          type: "/errors#internal-error",
          title: "Internal Server Error",
          status: 500,
          description: "An unexpected error occurred on the server. Please try again later. If the problem persists, contact support.",
          example: {
            type: "/errors#internal-error",
            title: "Internal Server Error",
            status: 500,
            detail: "An unexpected error occurred"
          }
        }
      ]
    };
  },
  computed: {
    clientErrors: function() {
      return this.errors.filter(function(e) {
        return e.status >= 400 && e.status < 500 && !e.id.includes("self") && !e.id.includes("user") && !e.id.includes("session") && !e.id.includes("duplicate");
      });
    },
    businessErrors: function() {
      return this.errors.filter(function(e) {
        return e.id.includes("self") || e.id.includes("user") || e.id.includes("session") || e.id.includes("duplicate");
      });
    },
    serverErrors: function() {
      return this.errors.filter(function(e) {
        return e.status >= 500;
      });
    }
  }
};

Navigation.add(ErrorsPage);