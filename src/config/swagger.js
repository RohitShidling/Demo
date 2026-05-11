const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MES Backend API - Manufacturing Execution System',
            version: '5.0.0',
            description: 'Complete API documentation for the MES (Manufacturing Execution System) backend for Cookware Manufacturing. This documentation reflects the actual backend implementation with precise request/response structures.',
            contact: { name: 'Rohit', email: 'rohit@mes.com' }
        },
        servers: [{ url: '/api', description: 'API Server' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter JWT token obtained from login' }
            },
            schemas: {
                // ─────────────────────────────────────────────────────────────
                // COMMON ENVELOPES
                // ─────────────────────────────────────────────────────────────
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation completed successfully' },
                        data: { type: 'object', additionalProperties: true }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error occurred' },
                        errors: { type: 'array', items: { type: 'object' }, nullable: true }
                    }
                },

                // ─────────────────────────────────────────────────────────────
                // AUTH SCHEMAS
                // ─────────────────────────────────────────────────────────────
                BusinessUser: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        is_active: { type: 'boolean' },
                        last_login: { type: 'string', format: 'date-time' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        userType: { type: 'string', example: 'business' }
                    }
                },
                OperatorUser: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string' },
                        is_active: { type: 'boolean' },
                        last_login: { type: 'string', format: 'date-time' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                        userType: { type: 'string', example: 'operator' }
                    }
                },
                AuthData: {
                    type: 'object',
                    properties: {
                        user: {
                            oneOf: [
                                { $ref: '#/components/schemas/BusinessUser' },
                                { $ref: '#/components/schemas/OperatorUser' }
                            ]
                        },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' }
                    }
                },
                OTPData: {
                    type: 'object',
                    properties: {
                        email: { type: 'string' },
                        expiresAt: { type: 'string', format: 'date-time' }
                    }
                },

                // ─────────────────────────────────────────────────────────────
                // DOMAIN SCHEMAS
                // ─────────────────────────────────────────────────────────────
                Machine: {
                    type: 'object',
                    properties: {
                        machine_id: { type: 'string' },
                        machine_name: { type: 'string' },
                        machine_image: { type: 'string', nullable: true, description: 'Base64 encoded image or URL' },
                        ingest_path: { type: 'string' },
                        status: { type: 'string', enum: ['NOT_STARTED', 'RUNNING', 'MAINTENANCE', 'STOPPED'] },
                        total_rejected: { type: 'integer' },
                        active_work_order: { type: 'string', nullable: true },
                        current_run: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                start_time: { type: 'string', format: 'date-time' },
                                end_time: { type: 'string', format: 'date-time', nullable: true },
                                total_count: { type: 'integer' },
                                accepted_count: { type: 'integer' },
                                rejected_count: { type: 'integer' },
                                last_activity_time: { type: 'string', format: 'date-time' }
                            }
                        }
                    }
                },
                WorkOrder: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        work_order_id: { type: 'string' },
                        work_order_name: { type: 'string' },
                        target: { type: 'integer' },
                        description: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['CREATED', 'NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                        targeted_end_date: { type: 'string', format: 'date', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                ChecklistItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        machine_id: { type: 'string', nullable: true },
                        checkpoint: { type: 'string' },
                        description: { type: 'string' },
                        specification: { type: 'string' },
                        method: { type: 'string' },
                        timing: { type: 'string' },
                        image: { type: 'string', format: 'byte', nullable: true },
                        sort_order: { type: 'integer' },
                        status: { type: 'string', enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
                        checked_at: { type: 'string', format: 'date-time', nullable: true },
                        checked_by: { type: 'integer', nullable: true }
                    }
                },
                DowntimeRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        machine_id: { type: 'string' },
                        reason: { type: 'string' },
                        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                        start_time: { type: 'string', format: 'date-time' },
                        end_time: { type: 'string', format: 'date-time', nullable: true },
                        status: { type: 'string' },
                        reported_by: { type: 'integer' }
                    }
                },
                Material: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        material_name: { type: 'string' },
                        quantity: { type: 'number' },
                        unit: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                QualityInspection: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        machine_id: { type: 'string' },
                        work_order_id: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['PASS', 'FAIL', 'PENDING'] },
                        parameters: { type: 'object', additionalProperties: true },
                        remarks: { type: 'string', nullable: true },
                        inspected_by: { type: 'integer' },
                        inspected_at: { type: 'string', format: 'date-time' }
                    }
                },
                Schedule: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        work_order_id: { type: 'string' },
                        machine_id: { type: 'string' },
                        start_time: { type: 'string', format: 'date-time' },
                        end_time: { type: 'string', format: 'date-time' },
                        status: { type: 'string' }
                    }
                },
                Shift: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        shift_name: { type: 'string' },
                        start_time: { type: 'string', description: 'HH:mm format' },
                        end_time: { type: 'string', description: 'HH:mm format' }
                    }
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        type: { type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] },
                        machine_id: { type: 'string', nullable: true },
                        is_read: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        action: { type: 'string' },
                        entity_type: { type: 'string' },
                        entity_id: { type: 'string' },
                        details: { type: 'object', additionalProperties: true },
                        ip_address: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Business Auth', description: 'Business User Authentication (Admin)' },
            { name: 'Operator Auth', description: 'Operator Authentication' },
            { name: 'Auth (Generic)', description: 'General User Authentication' },
            { name: 'Machines', description: 'Machine Management & Status' },
            { name: 'Work Orders', description: 'Work Order Management' },
            { name: 'Production', description: 'Production Recording & Ingestion' },
            { name: 'Checklist', description: 'Machine Checklists' },
            { name: 'Inventory', description: 'Material Inventory' },
            { name: 'Quality', description: 'Quality Inspections' },
            { name: 'Scheduling', description: 'Production Scheduling' },
            { name: 'Shifts', description: 'Shift Management' },
            { name: 'Notifications', description: 'System Notifications' },
            { name: 'Alerts', description: 'System Alerts' },
            { name: 'Operator', description: 'Operator Operations' },
            { name: 'Audit Logs', description: 'Activity Audit Logs' },
            { name: 'System', description: 'System Health' }
        ],
        paths: {
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    security: [],
                    responses: {
                        '200': {
                            description: 'Healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            timestamp: { type: 'string', format: 'date-time' },
                                            features: { type: 'array', items: { type: 'string' } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // ─────────────────────────────────────────────────────────────
            // BUSINESS AUTH
            // ─────────────────────────────────────────────────────────────
            '/business/auth/register/request-otp': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Request Registration OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'OTP sent',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/OTPData' }
                                        }
                                    }
                                }
                            }
                        },
                        '409': { description: 'Email already registered — use login' }
                    }
                }
            },
            '/business/auth/register': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Complete Registration',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email', 'otp'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' },
                                        otp: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Registered and signed in (JWT returned)',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/AuthData' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/business/auth/login/request-otp': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Request Login OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } } } }
                    },
                    responses: {
                        '200': { description: 'OTP sent', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/OTPData' } } } } } }
                    }
                }
            },
            '/business/auth/login': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Login with OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'otp'],
                                    properties: {
                                        email: { type: 'string' },
                                        otp: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Logged in',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/AuthData' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/business/auth/refresh': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Refresh Access Token',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['refreshToken'],
                                    properties: {
                                        refreshToken: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Token refreshed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    accessToken: { type: 'string' },
                                                    refreshToken: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/business/auth/logout': {
                post: {
                    tags: ['Business Auth'],
                    summary: 'Logout',
                    responses: {
                        '200': {
                            description: 'Logged out',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/SuccessResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/business/auth/me': {
                get: {
                    tags: ['Business Auth'],
                    summary: 'Get Profile',
                    responses: {
                        '200': {
                            description: 'Profile',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/BusinessUser' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // OPERATOR AUTH
            // ─────────────────────────────────────────────────────────────
            '/operator/auth/register/request-otp': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Request Registration OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'OTP sent',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/OTPData' }
                                        }
                                    }
                                }
                            }
                        },
                        '409': { description: 'Email already registered — use login instead' }
                    }
                }
            },
            '/operator/auth/register': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Complete Registration',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email', 'otp'],
                                    properties: {
                                        name: { type: 'string' },
                                        email: { type: 'string' },
                                        otp: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Registered and signed in (JWT returned)',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/AuthData' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/operator/auth/login/request-otp': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Request Login OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email'],
                                    properties: {
                                        email: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'OTP sent',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/OTPData' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/operator/auth/login': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Login with OTP',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'otp'],
                                    properties: {
                                        email: { type: 'string' },
                                        otp: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Logged in',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { $ref: '#/components/schemas/AuthData' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/operator/auth/refresh': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Refresh Access Token',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['refreshToken'],
                                    properties: {
                                        refreshToken: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Token refreshed',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    accessToken: { type: 'string' },
                                                    refreshToken: { type: 'string' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/operator/auth/logout': {
                post: {
                    tags: ['Operator Auth'],
                    summary: 'Logout',
                    responses: {
                        '200': {
                            description: 'Logged out',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/SuccessResponse' }
                                }
                            }
                        }
                    }
                }
            },
            '/operator/auth/me': {
                get: {
                    tags: ['Operator Auth'],
                    summary: 'Get Profile',
                    responses: {
                        '200': {
                            description: 'Profile',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: { $ref: '#/components/schemas/OperatorUser' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // GENERIC AUTH
            // ─────────────────────────────────────────────────────────────
            '/auth/register': {
                post: {
                    tags: ['Auth (Generic)'],
                    summary: 'Generic User Registration',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'email', 'password', 'full_name'],
                                    properties: {
                                        username: { type: 'string' },
                                        email: { type: 'string' },
                                        password: { type: 'string' },
                                        full_name: { type: 'string' },
                                        role: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Registered',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            message: { type: 'string' },
                                            data: { type: 'object' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/auth/login': {
                post: {
                    tags: ['Auth (Generic)'],
                    summary: 'Generic User Login',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'password'],
                                    properties: {
                                        username: { type: 'string' },
                                        password: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': { description: 'Logged in', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { $ref: '#/components/schemas/AuthData' } } } } } }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // MACHINES
            // ─────────────────────────────────────────────────────────────
            '/machines': {
                get: {
                    tags: ['Machines'],
                    summary: 'List all machines',
                    parameters: [
                        { name: 'include_images', in: 'query', schema: { type: 'boolean', default: true } }
                    ],
                    responses: {
                        '200': {
                            description: 'Machines list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: { $ref: '#/components/schemas/Machine' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: ['Machines'],
                    summary: 'Create new machine',
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    required: ['machine_name', 'ingest_path'],
                                    properties: {
                                        machine_name: { type: 'string' },
                                        ingest_path: { type: 'string', description: 'Unique path for data ingestion' },
                                        machine_image: { type: 'string', format: 'binary' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Machine' } } } }
                    }
                }
            },
            '/machines/production-count': {
                get: {
                    tags: ['Machines'],
                    summary: 'Get production count for all machines',
                    responses: {
                        '200': {
                            description: 'Counts list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        machine_id: { type: 'string' },
                                                        machine_name: { type: 'string' },
                                                        total_production_count: { type: 'integer' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/machines/rejection-count': {
                get: {
                    tags: ['Machines'],
                    summary: 'Get rejection count for all machines',
                    responses: {
                        '200': {
                            description: 'Counts list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        machine_id: { type: 'string' },
                                                        machine_name: { type: 'string' },
                                                        total_rejected_count: { type: 'integer' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/machines/{machineId}/details': {
                get: {
                    tags: ['Machines'],
                    summary: 'Get detailed machine info',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Machine details', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Machine' } } } } } }
                    }
                }
            },
            '/machines/{machineId}/visualization': {
                get: {
                    tags: ['Machines'],
                    summary: 'Get visualization data',
                    parameters: [
                        { name: 'machineId', in: 'path', required: true, schema: { type: 'string' } },
                        { name: 'filter', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'calendar', 'monthly'] } },
                        { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
                        { name: 'month', in: 'query', schema: { type: 'string', example: '2026-05', description: 'Required with filter=monthly (YYYY-MM)' } }
                    ],
                    responses: {
                        '200': { description: 'Visualization data' }
                    }
                }
            },
            '/machines/{machineId}/production/hourly': {
                get: {
                    tags: ['Machines'],
                    summary: 'Last 24 hours production (hourly)',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Hourly slots' }
                    }
                }
            },
            '/machines/{machineId}/production/daily': {
                get: {
                    tags: ['Machines'],
                    summary: 'Last 31 days production (daily)',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Daily slots' }
                    }
                }
            },
            '/machines/{machineId}/downtime': {
                get: {
                    tags: ['Machines'],
                    summary: 'Downtime history',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'History list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/DowntimeRecord' } } } } } } }
                    }
                },
                post: {
                    tags: ['Machines'],
                    summary: 'Record downtime',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['reason', 'severity', 'start_time'], properties: { reason: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, start_time: { type: 'string', format: 'date-time' }, end_time: { type: 'string', format: 'date-time' } } } } }
                    },
                    responses: {
                        '201': { description: 'Recorded' }
                    }
                }
            },
            '/machines/{machineId}/stop': {
                post: {
                    tags: ['Machines'],
                    summary: 'Stop machine (end active run)',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Stopped', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'stopped' }, run_id: { type: 'integer' } } } } } }
                    }
                }
            },
            '/ingest/{pathId}': {
                post: {
                    tags: ['Production'],
                    summary: 'Data Ingestion Endpoint (Simulator/Hardware)',
                    security: [],
                    parameters: [{ name: 'pathId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Received', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'received' } } } } } },
                        '403': { description: 'Machine not assigned to an active work order' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // WORK ORDERS
            // ─────────────────────────────────────────────────────────────
            '/work-orders': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'List all work orders',
                    responses: {
                        '200': { description: 'List', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/WorkOrder' } } } } } } }
                    }
                },
                post: {
                    tags: ['Work Orders'],
                    summary: 'Create work order',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['work_order_id', 'work_order_name', 'target'], properties: { work_order_id: { type: 'string' }, work_order_name: { type: 'string' }, target: { type: 'integer' }, description: { type: 'string' }, targeted_end_date: { type: 'string', format: 'date' } } } } }
                    },
                    responses: {
                        '201': { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/WorkOrder' } } } } } }
                    }
                }
            },
            '/work-orders/{workOrderId}': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get work order by ID',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Found', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/WorkOrder' } } } } } }
                    }
                },
                put: {
                    tags: ['Work Orders'],
                    summary: 'Update work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        content: { 'application/json': { schema: { type: 'object', properties: { work_order_name: { type: 'string' }, target: { type: 'integer' }, status: { type: 'string' } } } } }
                    },
                    responses: {
                        '200': { description: 'Updated' }
                    }
                },
                delete: {
                    tags: ['Work Orders'],
                    summary: 'Delete work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Deleted' }
                    }
                }
            },
            '/work-orders/{workOrderId}/production-summary': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get production summary for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Summary data' }
                    }
                }
            },
            '/work-orders/{workOrderId}/machine-production': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Get machine-wise production for work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Machine production data' }
                    }
                }
            },
            '/work-orders/{workOrderId}/production-metrics': {
                get: {
                    tags: ['Work Orders'],
                    summary: 'Work order production metrics (produced, accepted, rejected, target date)',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Aggregated metrics (same shape as /summary without group_by)' }
                    }
                }
            },
            '/work-orders/{workOrderId}/assign': {
                post: {
                    tags: ['Work Orders'],
                    summary: 'Assign machine to work order',
                    parameters: [{ name: 'workOrderId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'stage_order'], properties: { machine_id: { type: 'string' }, stage_order: { type: 'integer' } } } } }
                    },
                    responses: {
                        '200': { description: 'Assigned' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // CHECKLIST EXTENSIONS
            // ─────────────────────────────────────────────────────────────
            '/checklist/template/sync/{sourceMachineId}': {
                post: {
                    tags: ['Checklist'],
                    summary: 'Sync checklist template to all machines',
                    parameters: [{ name: 'sourceMachineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Synced' }
                    }
                }
            },
            '/checklist/{machineId}/reorder': {
                put: {
                    tags: ['Checklist'],
                    summary: 'Reorder machine checklist items',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['ordered_ids'], properties: { ordered_ids: { type: 'array', items: { type: 'integer' } } } } } }
                    },
                    responses: {
                        '200': { description: 'Reordered' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // PRODUCTION
            // ─────────────────────────────────────────────────────────────
            '/production': {
                post: {
                    tags: ['Production'],
                    summary: 'Record production manually',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'produced_count'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, produced_count: { type: 'integer' }, rejected_count: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' } } } } }
                    },
                    responses: {
                        '201': { description: 'Recorded' }
                    }
                }
            },
            '/production/ingest': {
                post: {
                    tags: ['Production'],
                    summary: 'Ingest production data (Batch/Simulated)',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'produced_count'], properties: { machine_id: { type: 'string' }, work_order_id: { type: 'string' }, produced_count: { type: 'integer' }, rejected_count: { type: 'integer' } } } } }
                    },
                    responses: {
                        '200': { description: 'Ingested' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // CHECKLIST
            // ─────────────────────────────────────────────────────────────
            '/checklist': {
                get: {
                    tags: ['Checklist'],
                    summary: 'Get all checklists (grouped by machine)',
                    responses: {
                        '200': { description: 'Checklists grouped by machine', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: { type: 'array', items: { $ref: '#/components/schemas/ChecklistItem' } } } } } } } }
                    }
                }
            },
            '/checklist/generic': {
                get: {
                    tags: ['Checklist'],
                    summary: 'Get generic checklist items',
                    responses: {
                        '200': { description: 'Generic items', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/ChecklistItem' } } } } } } }
                    },
                    post: {
                        tags: ['Checklist'],
                        summary: 'Create generic checklist item (syncs to all machines)',
                        requestBody: {
                            required: true,
                            content: { 'multipart/form-data': { schema: { type: 'object', required: ['checkpoint'], properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, specification: { type: 'string' }, method: { type: 'string' }, timing: { type: 'string' }, sort_order: { type: 'integer' }, image: { type: 'string', format: 'binary' } } } } }
                        },
                        responses: {
                            '201': { description: 'Created' }
                        }
                    }
                }
            },
            '/checklist/summary': {
                get: {
                    tags: ['Checklist'],
                    summary: 'Get checklist summary for all machines',
                    responses: {
                        '200': {
                            description: 'Summary',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        machine_id: { type: 'string' },
                                                        total_items: { type: 'integer' },
                                                        completed_items: { type: 'integer' },
                                                        status: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/checklist/{machineId}': {
                get: {
                    tags: ['Checklist'],
                    summary: 'Get checklist for a specific machine',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Machine checklist', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/ChecklistItem' } } } } } } }
                    }
                }
            },
            '/checklist/generic/bulk': {
                post: {
                    tags: ['Checklist'],
                    summary: 'Bulk create generic checklist items',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: { type: 'object', properties: { checkpoint: { type: 'string' }, description: { type: 'string' } } } } } } } }
                    },
                    responses: {
                        '201': { description: 'Created' }
                    }
                }
            },
            '/checklist/item/{itemId}': {
                get: {
                    tags: ['Checklist'],
                    summary: 'Get single checklist item',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Found' }
                    }
                },
                put: {
                    tags: ['Checklist'],
                    summary: 'Update checklist item',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        content: { 'multipart/form-data': { schema: { type: 'object', properties: { checkpoint: { type: 'string' }, description: { type: 'string' }, image: { type: 'string', format: 'binary' } } } } }
                    },
                    responses: {
                        '200': { description: 'Updated' }
                    }
                },
                delete: {
                    tags: ['Checklist'],
                    summary: 'Delete checklist item',
                    parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Deleted' }
                    }
                }
            },
            '/checklist/{machineId}/progress': {
                put: {
                    tags: ['Checklist'],
                    summary: 'Save machine checklist progress',
                    parameters: [{ name: 'machineId', in: 'path', required: true, schema: { type: 'string' } }],
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', additionalProperties: { type: 'string', enum: ['PENDING', 'COMPLETED'] } } } }
                    },
                    responses: {
                        '200': { description: 'Progress saved' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // OPERATOR OPERATIONS
            // ─────────────────────────────────────────────────────────────
            '/operator/skills': {
                get: {
                    tags: ['Operator'],
                    summary: 'Get my skills',
                    responses: {
                        '200': {
                            description: 'Skills',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    operator_name: { type: 'string' },
                                                    skill_set: {
                                                        type: 'array',
                                                        items: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: ['Operator'],
                    summary: 'Update my skills',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['operator_name', 'skill_set'], properties: { operator_name: { type: 'string' }, skill_set: { type: 'array', items: { type: 'string' } } } } } }
                    },
                    responses: {
                        '200': { description: 'Updated' }
                    }
                }
            },
            '/operator/assignments': {
                get: {
                    tags: ['Operator'],
                    summary: 'Get my machine assignments',
                    responses: {
                        '200': {
                            description: 'Assignments list',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean' },
                                            data: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        machine_id: { type: 'string' },
                                                        machine_name: { type: 'string' },
                                                        assigned_at: { type: 'string', format: 'date-time' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                post: {
                    tags: ['Operator'],
                    summary: 'Self-assign to machine',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['machine_id'], properties: { machine_id: { type: 'string' }, mentor_name: { type: 'string' } } } } }
                    },
                    responses: {
                        '200': { description: 'Assigned' }
                    }
                }
            },
            '/operator/breakdowns': {
                get: {
                    tags: ['Operator'],
                    summary: 'List active breakdowns',
                    responses: {
                        '200': { description: 'Breakdowns list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/DowntimeRecord' } } } } } } }
                    }
                },
                post: {
                    tags: ['Operator'],
                    summary: 'Report machine breakdown',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['machine_id', 'problem_description'], properties: { machine_id: { type: 'string' }, problem_description: { type: 'string' }, severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }, breakdown_reason: { type: 'string' }, comment: { type: 'string' } } } } }
                    },
                    responses: {
                        '201': { description: 'Reported' }
                    }
                }
            },
            '/operator/rejections': {
                post: {
                    tags: ['Operator'],
                    summary: 'Report part rejection',
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    required: ['machine_id', 'rejection_reason'],
                                    properties: {
                                        machine_id: { type: 'string' },
                                        work_order_id: { type: 'string' },
                                        rejection_reason: { type: 'string' },
                                        rework_reason: { type: 'string' },
                                        part_description: { type: 'string' },
                                        supervisor_name: { type: 'string' },
                                        rejected_count: { type: 'integer', default: 1 },
                                        part_image: { type: 'string', format: 'binary' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '201': { description: 'Reported' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // DASHBOARD
            // ─────────────────────────────────────────────────────────────
            '/dashboard/overview': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Get dashboard overview statistics',
                    responses: {
                        '200': { description: 'Overview data' }
                    }
                }
            },
            '/dashboard/work-orders': {
                get: {
                    tags: ['Dashboard'],
                    summary: 'Get work orders dashboard statistics',
                    responses: {
                        '200': { description: 'Work orders statistics' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // NOTIFICATIONS
            // ─────────────────────────────────────────────────────────────
            '/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'Get notifications',
                    parameters: [{ name: 'machine_id', in: 'query', schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Notifications list', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } } } }
                    }
                },
                post: {
                    tags: ['Notifications'],
                    summary: 'Create manual notification',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { type: 'object', required: ['title', 'message', 'type'], properties: { title: { type: 'string' }, message: { type: 'string' }, type: { type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'SUCCESS'] }, machine_id: { type: 'string' }, user_id: { type: 'integer' }, user_type: { type: 'string' } } } } }
                    },
                    responses: {
                        '201': { description: 'Created' }
                    }
                },
                delete: {
                    tags: ['Notifications'],
                    summary: 'Delete all notifications',
                    responses: {
                        '200': { description: 'All deleted' }
                    }
                }
            },
            '/notifications/{id}/read': {
                patch: {
                    tags: ['Notifications'],
                    summary: 'Mark notification as read',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Marked as read' }
                    }
                }
            },
            '/notifications/{id}': {
                delete: {
                    tags: ['Notifications'],
                    summary: 'Delete specific notification',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        '200': { description: 'Deleted' }
                    }
                }
            },

            // ─────────────────────────────────────────────────────────────
            // ALERTS
            // ─────────────────────────────────────────────────────────────
            '/alerts': {
                get: {
                    tags: ['Alerts'],
                    summary: 'Get active system alerts',
                    responses: {
                        '200': { description: 'Alerts list' }
                    }
                }
            },
            '/alerts/{alertId}/resolve': {
                post: {
                    tags: ['Alerts'],
                    summary: 'Resolve an alert',
                    parameters: [{ name: 'alertId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        '200': { description: 'Resolved' }
                    }
                }
            }
        }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(options);

// Post-processing to inject common error response structures
const ensureResponseSchemas = (spec) => {
    if (!spec || !spec.paths) return spec;
    for (const path in spec.paths) {
        for (const method in spec.paths[path]) {
            const op = spec.paths[path][method];
            if (!op.responses) continue;
            for (const code in op.responses) {
                const resp = op.responses[code];
                if (!resp.content && parseInt(code) >= 400) {
                    resp.content = { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } };
                }
            }
        }
    }
    return spec;
};

ensureResponseSchemas(swaggerSpec);
module.exports = swaggerSpec;
