// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { TestCase } from '../framework/types.js';

export interface WebTaskAgentArgs {
  task: string;
  reasoning: string;
  context?: string;
  extraction_schema?: object;
}

// Basic site-specific search test
export const basicSiteSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-search-001',
  name: 'Site-Specific Search Task',
  description: 'Test web task agent orchestrating a search workflow on a specific site',
  url: 'chrome://new-tab-page',
  tool: 'web_task_agent',
  input: {
    task: 'Search Google for "Chrome DevTools automation" and extract the top 3 search results',
    reasoning: 'Testing basic site-specific search workflow orchestration',
    context: 'Need to demonstrate web_task_agent can coordinate multiple action_agent calls for a complete search workflow'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully returned exactly 3 search results in structured text format',
        'Each result is numbered (1., 2., 3.) and contains a title related to "Chrome DevTools automation"',
        'Each result includes a URL in the format "URL: [link]"',
        'Results are presented in a clear, readable text format (not JSON)',
        'Response includes a brief summary or conclusion statement'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify search was completed and results page is showing',
          'Check that search results are related to "Chrome DevTools automation"',
          'Confirm at least 3 search results are visible on the page',
          'Ensure the search workflow was completed successfully'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'orchestration', 'search', 'workflow', 'google', 'basic']
  }
};

// E-commerce product search test  
export const ecommerceSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-ecommerce-001',
  name: 'E-commerce Product Search',
  description: 'Test web task agent handling product search on shopping site',
  url: 'https://www.amazon.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search Amazon for "wireless headphones" and find products under $100',
    reasoning: 'Testing e-commerce search workflow with price filtering',
    context: 'User wants to find wireless headphones with specific price constraint',
    extraction_schema: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string' },
              rating: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully found wireless headphones products on Amazon',
        'Returned products that are under $100 as requested',
        'Each product includes name, price, rating, and URL fields',
        'Results are presented in clear, structured text format (not JSON)',
        'All products listed are relevant to "wireless headphones"',
        'Price information is clearly stated for each product',
        'Products are numbered or bulleted for easy reading'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Amazon search results are showing wireless headphones',
          'Check that visible products are under $100 price range',
          'Confirm product listings include name, price, and rating information',
          'Ensure search and filtering workflow completed successfully'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'ecommerce', 'search', 'filtering', 'amazon', 'structured-data']
  }
};

// Multi-step booking workflow test
export const bookingWorkflowTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-booking-001', 
  name: 'Hotel Search Workflow',
  description: 'Test web task agent orchestrating complex multi-step booking search',
  url: 'https://www.booking.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for hotels in San Francisco for 2 adults, check-in March 15, check-out March 17',
    reasoning: 'Customer is looking for travel booking',
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully searched for hotels in San Francisco',
        'Results show hotels available for March 15-17 dates',
        'Guest count of 2 adults is reflected in the search results',
        'Returned multiple hotel options with relevant details',
        'Each hotel includes essential information (name, price, location)',
        'Results are presented in a clear, readable format'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify hotel search results are displayed for San Francisco',
          'Check that dates March 15-17 are correctly selected',
          'Confirm guest count shows 2 adults',
          'Ensure search results show hotels with availability for specified dates'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'booking', 'workflow', 'multi-step', 'travel', 'complex']
  }
};

// Flight search with complex criteria
export const flightSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-flight-001',
  name: 'Complex Flight Search',
  description: 'Test web task agent handling complex flight search with multiple criteria',
  url: 'https://www.kayak.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for round-trip flights from Seattle (SEA) to Tokyo (NRT) departing March 20, returning March 30',
    reasoning: 'Customer is looking for finding the best flight options',
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully found round-trip flights from Seattle (SEA) to Tokyo (NRT)',
        'Flight results show March 20 departure date',
        'Flight results show March 30 return date',
        'Returned multiple flight options with airlines and prices',
        'Each flight includes essential details (times, airlines, prices)',
        'Results clearly distinguish between outbound and return flights'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify flight search results are displayed',
          'Check SEA to NRT route is correctly selected',
          'Confirm dates March 20 departure and March 30 return',
          'Ensure flight options are showing with prices and airlines'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'flight', 'travel', 'multi-step', 'kayak', 'round-trip']
  }
};

// Error recovery and retry test
export const errorRecoveryTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-error-001',
  name: 'Error Recovery Workflow',
  description: 'Test web task agent handling action_agent failures and retry logic',
  url: 'https://www.google.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for "nonexistent test query 12345" and handle any issues that arise',
    reasoning: 'Customer is asking for this response'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Attempted to search for the unusual query "nonexistent test query 12345"',
        'Either found some results OR provided clear explanation why no results were found',
        'Response handles the edge case gracefully without errors',
        'If no results found, suggested alternative actions or explanations',
        'Maintained professional tone despite unusual request',
        'Final output is coherent and helpful to the user'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Check if search was attempted despite unusual query',
          'Verify error handling did not break the page interaction',
          'Confirm agent attempted to complete the task or provided clear error info',
          'Ensure page is still functional after error recovery attempts'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'error-recovery', 'retry', 'orchestration', 'robustness']
  }
};

// Data extraction focus test
export const dataExtractionTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-extract-001',
  name: 'Structured Data Extraction',
  description: 'Test web task agent extracting structured data from search results',
  url: 'https://news.ycombinator.com',
  tool: 'web_task_agent',
  input: {
    task: 'Extract the top 5 Hacker News stories with their titles, scores, and comment counts',
    reasoning: 'User is looking to understand the top stories on Hacker News',
    extraction_schema: {
      type: 'object',
      properties: {
        stories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              score: { type: 'number' },
              comments: { type: 'number' },
              url: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully returned exactly 5 Hacker News stories in structured text format',
        'Each story is numbered (1., 2., 3., 4., 5.) with title, score, comments, and URL',
        'Results are presented in readable text format similar to the example provided',
        'Response includes all required fields: title, score, comments count, URL',
        'Maintained proper orchestration pattern throughout the extraction process'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Hacker News homepage is loaded and displaying stories',
          'Check that top stories are visible with scores and comment counts',
          'Confirm story titles and metadata are clearly displayed',
          'Ensure page structure allows for data extraction'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'data-extraction', 'structured-data', 'hackernews', 'schema']
  }
};

// Navigation-focused test
export const navigationWorkflowTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-nav-001',
  name: 'Site Navigation Workflow',
  description: 'Test web task agent orchestrating navigation between different sections of a site',
  url: 'https://www.wikipedia.org',
  tool: 'web_task_agent',
  input: {
    task: 'Navigate to the Wikipedia homepage, search for "artificial intelligence", and find information about machine learning',
    reasoning: 'User is looking to explore Wikipedia content through structured navigation',
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Orchestrated Wikipedia search via action_agent calls',
        'Navigated to artificial intelligence article through action_agent',
        'Located machine learning section via action_agent coordination',
        'Extracted relevant information about machine learning',
        'Demonstrated multi-step navigation workflow',
        'Maintained orchestration pattern throughout navigation',
        'Provided structured summary of found information'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify navigation reached artificial intelligence Wikipedia page',
          'Check that machine learning section or content is visible',
          'Confirm successful navigation through multiple page sections',
          'Ensure content related to machine learning is displayed'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'navigation', 'multi-step', 'wikipedia', 'content-exploration']
  }
};

// Job Search - LinkedIn/Indeed workflow
export const jobSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-jobs-001',
  name: 'Job Search Workflow',
  description: 'Test web task agent orchestrating job search on LinkedIn',
  url: 'https://www.linkedin.com/jobs',
  tool: 'web_task_agent',
  input: {
    task: 'Search for "Software Engineer" jobs in "San Francisco" and extract details for the first 5 results',
    reasoning: 'User wants to find job opportunities in tech industry',
    extraction_schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              salary: { type: 'string' },
              description: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Either used construct_direct_url for LinkedIn job search OR used traditional form interaction',
        'If using direct URL: constructed proper LinkedIn job search URL with keywords and location',
        'If using forms: delegated keyword and location input to action_agent',
        'Extracted job listings using schema_based_extractor',
        'Returned structured job data in readable text format (not JSON)',
        'Each job listing includes title, company, location, and other relevant fields',
        'Results are numbered or organized clearly for easy reading',
        'Demonstrated proper workflow orchestration for job search',
        'Never used direct browser interaction tools'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify LinkedIn job search results are displayed',
          'Check that search shows Software Engineer jobs in San Francisco',
          'Confirm job listings include company names and titles',
          'Ensure at least 5 job results are visible'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'jobs', 'linkedin', 'search', 'career', 'popular']
  }
};

// Social Media - Content Extraction
export const socialMediaExtractionTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-social-001',
  name: 'Social Media Content Extraction',
  description: 'Test extracting trending topics and posts from social media',
  url: 'https://twitter.com/explore',
  tool: 'web_task_agent',
  input: {
    task: 'Extract the top 5 trending topics from Twitter/X explore page',
    reasoning: 'User wants to stay updated on current trends',
    extraction_schema: {
      type: 'object',
      properties: {
        trends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              posts_count: { type: 'string' },
              category: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully accessed Twitter/X explore page and found trending topics',
        'Returned exactly 5 trending topics as requested',
        'Each topic includes the trend name/hashtag',
        'Post counts or metrics are included when available',
        'Topics are current/recent trends (not outdated)',
        'Results are presented in clear, numbered text format (not JSON)',
        'Each trend is properly numbered (1., 2., 3., etc.) for readability'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Twitter/X explore page is loaded',
          'Check that trending topics section is visible',
          'Confirm trending topics show names and post counts',
          'Ensure page shows current trending content'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'social-media', 'twitter', 'trends', 'extraction', 'popular']
  }
};

// Real Estate - Property Search
export const realEstateSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-realestate-001',
  name: 'Real Estate Property Search',
  description: 'Test property search workflow on real estate platforms',
  url: 'https://www.zillow.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for houses for sale in Austin, Texas under $500k and extract property details',
    reasoning: 'User wants to find affordable housing options in a specific location',
    extraction_schema: {
      type: 'object',
      properties: {
        properties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              price: { type: 'string' },
              bedrooms: { type: 'number' },
              bathrooms: { type: 'number' },
              sqft: { type: 'string' },
              lot_size: { type: 'string' },
              year_built: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Orchestrated location search via action_agent',
        'Delegated price filter setting to action_agent',
        'Coordinated property type selection through action_agent',
        'Applied search filters through proper action_agent calls',
        'Extracted property listings with schema_based_extractor',
        'Returned structured property data in readable text format (not JSON)',
        'Each property includes address, price, bedrooms, bathrooms, and other key details',
        'Properties are clearly numbered or organized for easy comparison',
        'Demonstrated complex real estate search workflow orchestration'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Zillow search results for Austin, Texas properties',
          'Check that properties shown are under $500k',
          'Confirm property listings show price, beds, baths info',
          'Ensure search results match the specified criteria'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'real-estate', 'zillow', 'property-search', 'popular']
  }
};

// News Aggregation
export const newsAggregationTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-news-001',
  name: 'News Article Aggregation',
  description: 'Test aggregating news headlines and summaries from news sites',
  url: 'https://news.ycombinator.com',
  tool: 'web_task_agent',
  input: {
    task: 'Extract the top 10 Hacker News stories with titles, scores, and first few comments',
    reasoning: 'Users want automated news monitoring for research and awareness',
    extraction_schema: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              score: { type: 'number' },
              comments_count: { type: 'number' },
              url: { type: 'string' },
              top_comment: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully extracted 10 Hacker News stories as requested',
        'Each story includes title, score, and comment count',
        'URLs are provided for each story',
        'Stories appear to be from the current top/front page',
        'Results are presented in clear, numbered text format (1-10), not JSON',
        'All required fields are present and properly formatted in readable text',
        'Each story is clearly separated and easy to read'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Hacker News stories are visible with scores',
          'Check that story titles and comment counts are shown',
          'Confirm top stories section is properly displayed',
          'Ensure story metadata is accessible for extraction'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'news', 'hackernews', 'aggregation', 'popular']
  }
};

// Online Learning - Course Search
export const coursePlatformTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-learning-001',
  name: 'Online Course Search',
  description: 'Test searching and extracting course information from learning platforms',
  url: 'https://www.coursera.org',
  tool: 'web_task_agent',
  input: {
    task: 'Search for "Machine Learning" courses and extract details for top 5 results',
    reasoning: 'Users want to compare courses across platforms for learning decisions',
    extraction_schema: {
      type: 'object',
      properties: {
        courses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              instructor: { type: 'string' },
              university: { type: 'string' },
              rating: { type: 'string' },
              duration: { type: 'string' },
              price: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully found Machine Learning courses on Coursera',
        'Returned details for top 5 courses as requested',
        'Each course includes title, instructor, university, and rating',
        'Duration and pricing information included for each course',
        'Course descriptions or key topics are provided',
        'Results are presented in structured text format (not JSON)',
        'Courses are numbered (1-5) and well-organized for easy comparison',
        'Each course entry is clearly formatted and readable'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Coursera search results for Machine Learning',
          'Check that courses show titles, instructors, and ratings',
          'Confirm course details include duration and pricing',
          'Ensure search results are relevant to Machine Learning'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'education', 'coursera', 'courses', 'learning', 'popular']
  }
};

// Restaurant/Food Delivery Search
export const restaurantSearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-food-001',
  name: 'Restaurant Search and Menu Extraction',
  description: 'Test searching restaurants and extracting menu information',
  url: 'https://www.yelp.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for "Italian restaurants near me" in San Francisco and extract restaurant details',
    reasoning: 'Users want to quickly compare restaurants, menus, and reviews',
    extraction_schema: {
      type: 'object',
      properties: {
        restaurants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              rating: { type: 'string' },
              price_range: { type: 'string' },
              cuisine: { type: 'string' },
              address: { type: 'string' },
              phone: { type: 'string' },
              hours: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully found Italian restaurants in San Francisco',
        'Each restaurant includes name, rating, and price range',
        'Location/address information is provided for each restaurant',
        'Contact details (phone/hours) included when available',
        'All restaurants listed serve Italian cuisine',
        'Results are presented in clear, structured text format (not JSON)',
        'Restaurants are numbered or organized clearly for easy comparison'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Yelp search results for Italian restaurants',
          'Check that restaurants show ratings and price ranges',
          'Confirm location filter shows San Francisco results',
          'Ensure restaurant listings include contact information'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'restaurants', 'yelp', 'food', 'local-search', 'popular']
  }
};

// Stock/Financial Information
export const stockResearchTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-finance-001',
  name: 'Stock Information Research',
  description: 'Test extracting stock prices and financial information',
  url: 'https://finance.yahoo.com',
  tool: 'web_task_agent',
  input: {
    task: 'Search for Apple (AAPL) stock information and extract current price, market cap, and recent performance',
    reasoning: 'Users need automated financial data collection for investment decisions',
    extraction_schema: {
      type: 'object',
      properties: {
        stock_info: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            company_name: { type: 'string' },
            current_price: { type: 'string' },
            change: { type: 'string' },
            change_percent: { type: 'string' },
            market_cap: { type: 'string' },
            pe_ratio: { type: 'string' },
            volume: { type: 'string' }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully found Apple (AAPL) stock information',
        'Current stock price is clearly stated',
        'Market cap information is included',
        'Price change and percentage change are provided',
        'Additional metrics (PE ratio, volume) included when available',
        'Financial data is current and presented in readable text format (not JSON)',
        'Stock information is well-organized and easy to understand'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Yahoo Finance shows Apple (AAPL) stock page',
          'Check that current stock price and change are visible',
          'Confirm market cap and trading volume are displayed',
          'Ensure financial metrics and charts are shown'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'finance', 'stocks', 'yahoo-finance', 'investment', 'popular']
  }
};

// Infinite Scroll Test
export const infiniteScrollTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-scroll-001',
  name: 'Infinite Scroll Content Loading',
  description: 'Test web task agent handling infinite scroll pages to load more content',
  url: 'https://twitter.com',
  tool: 'web_task_agent',
  input: {
    task: 'Scroll down the Twitter feed to load at least 20 tweets and extract their content',
    reasoning: 'Testing infinite scroll functionality for dynamic content loading',
    extraction_schema: {
      type: 'object',
      properties: {
        tweets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              author: { type: 'string' },
              content: { type: 'string' },
              likes: { type: 'string' },
              retweets: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully used scroll_page tool to scroll down the page',
        'Loaded additional content through scrolling actions',
        'Extracted at least 20 tweets from the feed',
        'Each tweet includes author and content information',
        'Demonstrated proper handling of dynamically loaded content',
        'Results are presented in clear, numbered text format'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify initial Twitter feed is loaded',
          'Check that scrolling action loaded additional tweets',
          'Confirm at least 20 tweets are visible after scrolling',
          'Ensure page scrolled down significantly from initial position'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'scrolling', 'infinite-scroll', 'dynamic-content', 'twitter']
  }
};

// Product Review Scroll Test
export const productReviewScrollTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-scroll-002',
  name: 'Product Review Scrolling',
  description: 'Test scrolling to load more product reviews on e-commerce sites',
  url: 'https://www.amazon.com/dp/B08N5WRWNW',  // Echo Dot product page
  tool: 'web_task_agent',
  input: {
    task: 'Scroll down to the reviews section and load more reviews by scrolling, then extract review details',
    reasoning: 'Users need to see multiple reviews beyond initial visible ones',
    extraction_schema: {
      type: 'object',
      properties: {
        reviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rating: { type: 'string' },
              title: { type: 'string' },
              author: { type: 'string' },
              date: { type: 'string' },
              verified: { type: 'boolean' },
              content: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Used scroll_page tool to navigate to reviews section',
        'Scrolled within reviews area to load additional reviews',
        'Extracted multiple product reviews with ratings',
        'Each review includes rating, author, and content',
        'Successfully handled lazy-loaded review content',
        'Presented reviews in structured, readable format'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Amazon product page is loaded',
          'Check that page scrolled to reviews section',
          'Confirm additional reviews loaded after scrolling',
          'Ensure review content is fully visible'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'scrolling', 'reviews', 'amazon', 'e-commerce']
  }
};

// News Site Article Loading Test
export const newsArticleScrollTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-scroll-003',
  name: 'News Article Progressive Loading',
  description: 'Test scrolling through news sites that load articles progressively',
  url: 'https://medium.com/topic/technology',
  tool: 'web_task_agent',
  input: {
    task: 'Scroll down to load more technology articles and extract titles and authors for at least 15 articles',
    reasoning: 'Testing progressive content loading on news/blog platforms',
    extraction_schema: {
      type: 'object',
      properties: {
        articles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              author: { type: 'string' },
              reading_time: { type: 'string' },
              preview: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Used scroll_page tool multiple times to load content',
        'Successfully loaded at least 15 articles through scrolling',
        'Extracted article titles and author information',
        'Handled Medium\'s progressive loading mechanism',
        'Articles are from technology topic as requested',
        'Results presented in clear, numbered format'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Medium technology page is loaded',
          'Check that initial articles are visible',
          'Confirm scrolling loaded additional articles',
          'Ensure at least 15 articles are visible after scrolling'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'scrolling', 'progressive-loading', 'medium', 'articles']
  }
};

// Search Results Pagination via Scroll
export const searchResultsScrollTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-scroll-004',
  name: 'Search Results Infinite Scroll',
  description: 'Test handling search results that use infinite scroll instead of pagination',
  url: 'https://www.pinterest.com/search/pins/?q=web%20design',
  tool: 'web_task_agent',
  input: {
    task: 'Search for "web design" pins and scroll to load at least 30 results, then extract pin details',
    reasoning: 'Testing infinite scroll on visual search platforms',
    extraction_schema: {
      type: 'object',
      properties: {
        pins: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              saves: { type: 'string' },
              source: { type: 'string' }
            }
          }
        }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully performed search for "web design" pins',
        'Used scroll_page tool to trigger infinite scroll loading',
        'Loaded at least 30 pins through scrolling actions',
        'Extracted pin titles and metadata',
        'Handled Pinterest\'s masonry layout and lazy loading',
        'Results are well-organized and readable'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Pinterest search results for web design',
          'Check initial pins are displayed',
          'Confirm scrolling loaded many more pins',
          'Ensure grid layout shows 30+ pins after scrolling'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'scrolling', 'infinite-scroll', 'pinterest', 'visual-search']
  }
};

// Google Flights Scroll and Load More Test
export const googleFlightsScrollTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-scroll-005',
  name: 'Google Flights Scroll and Show More',
  description: 'Test scrolling and clicking "Show more flights" button on Google Flights to load additional flight options',
  url: 'https://www.google.com/travel/flights?sca_esv=646eedf97dcc8cf2&source=flun&uitype=cuAA&hl=en&gl=us&curr=USD&tfs=CAEQAhoeEgoyMDI2LTAzLTIwagcIARIDU0VBcgcIARIDTlJUGh4SCjIwMjYtMDMtMzBqBwgBEgNOUlRyBwgBEgNTRUF6aENqUklhVFJJTVVwVlZVOXpNakJCUTJodGVFRkNSeTB0TFMwdExTMHRjR3BpYjI4eE0wRkJRVUZCUjJoc1lsWlZRV2RYUlZsQkVnTmpTMFVhQ3dqUXNnVVFBaG9EVlZORU9EQncwTElG',
  tool: 'web_task_agent',
  input: {
    task: 'Extract the initial flight results, then scroll down and click "Show more flights" button to load additional flights. Extract at least 20 total flight options from Seattle to Tokyo.',
    reasoning: 'Testing combination of scrolling and button clicking to load more flight results on Google Flights',
    extraction_schema: {
      type: 'object',
      properties: {
        flights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              airline: { type: 'string' },
              departure_time: { type: 'string' },
              arrival_time: { type: 'string' },
              duration: { type: 'string' },
              stops: { type: 'string' },
              price: { type: 'string' },
              aircraft: { type: 'string' }
            }
          }
        },
        total_flights_found: { type: 'number' }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully extracted initial flight results from Google Flights',
        'Used scroll_page tool to scroll down the flight results list',
        'Located and clicked "Show more flights" button using action_agent',
        'Loaded additional flight options beyond the initial set',
        'Extracted at least 20 total flights from Seattle (SEA) to Tokyo (NRT)',
        'Each flight includes airline, times, duration, stops, and price',
        'Flights are for the correct dates (March 20-30, 2026)',
        'Results are presented in clear, numbered format',
        'Successfully combined scrolling and clicking actions to load more content'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Google Flights page shows SEA to NRT flights',
          'Check that initial flight results are displayed',
          'Confirm scrolling occurred and "Show more flights" button was visible',
          'Ensure additional flights loaded after clicking the button',
          'Verify at least 20 flight options are now visible'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'scrolling', 'google-flights', 'click-action', 'load-more', 'travel']
  }
};

// ANA Airlines Iframe Content Test
export const anaAirlinesIframeTest: TestCase<WebTaskAgentArgs> = {
  id: 'web-task-agent-iframe-001',
  name: 'ANA Airlines Iframe Content Extraction',
  description: 'Test web task agent handling iframe-heavy airline booking sites like ANA Airlines',
  url: 'https://aswbe.ana.co.jp/webapps/reservation/flight-search?CONNECTION_KIND=SEA&LANG=en&hiddenSearchMode=ROUND_TRIP&departureDate:field=20260320&returnDate:field=20260330&departureAirportCode:field=SEA&arrivalAirportCode:field=NRT&adultCount=1&youngAdultCount=0&childCount=0&infantCount=0&boardingClass=INTY001&searchFlag=1',
  tool: 'web_task_agent',
  input: {
    task: 'Navigate the ANA Airlines flight search page and extract available flight options from Seattle (SEA) to Tokyo Narita (NRT) for March 20-30, 2026. Handle any iframe content and booking interface elements.',
    reasoning: 'Testing iframe content extraction and complex airline booking site navigation',
    extraction_schema: {
      type: 'object',
      properties: {
        flights: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              flight_number: { type: 'string' },
              airline: { type: 'string' },
              departure_time: { type: 'string' },
              arrival_time: { type: 'string' },
              departure_date: { type: 'string' },
              arrival_date: { type: 'string' },
              duration: { type: 'string' },
              aircraft: { type: 'string' },
              price: { type: 'string' },
              cabin_class: { type: 'string' },
              stops: { type: 'string' }
            }
          }
        },
        booking_interface_status: { type: 'string' },
        iframe_content_found: { type: 'boolean' }
      }
    }
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully navigated ANA Airlines booking interface',
        'Handled iframe content correctly (iframe_content_found should be true if iframes detected)',
        'Extracted flight information from ANA flight search results',
        'Flight details include ANA flight numbers and accurate route (SEA to NRT)',
        'Extracted pricing information in appropriate currency',
        'Handled any booking interface elements, popups, or navigation flows',
        'Results show flights for the correct dates (March 20-30, 2026)',
        'Successfully demonstrated iframe content extraction capabilities',
        'Booking interface status indicates successful page interaction'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify ANA Airlines flight search page loaded correctly',
          'Check that search parameters show SEA to NRT route',
          'Confirm flight results are displayed (may be in iframes)',
          'Ensure booking interface elements are functional',
          'Verify flight information is accessible and extractable'
        ]
      }
    }
  },
  metadata: {
    tags: ['web-task', 'iframe', 'ana-airlines', 'complex-booking', 'international-flight', 'airline-specific']
  }
};

// Export all test cases
export const webTaskAgentTests: TestCase<WebTaskAgentArgs>[] = [
  // Core functionality tests
  basicSiteSearchTest,
  ecommerceSearchTest,
  bookingWorkflowTest,
  flightSearchTest,
  errorRecoveryTest,
  dataExtractionTest,
  navigationWorkflowTest,
  
  // Popular real-world scenarios
  jobSearchTest,
  socialMediaExtractionTest,
  realEstateSearchTest,
  newsAggregationTest,
  coursePlatformTest,
  restaurantSearchTest,
  stockResearchTest,
  
  // Scrolling tests
  infiniteScrollTest,
  productReviewScrollTest,
  newsArticleScrollTest,
  searchResultsScrollTest,
  googleFlightsScrollTest,
  
  // Iframe handling tests
  anaAirlinesIframeTest,
];