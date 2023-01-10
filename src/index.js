"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const extensionService = strapi.plugin("graphql").service("extension");

    const extension = ({ nexus }) => ({
      // Nexus
      types: [],
      plugins: [],
      // GraphQL SDL
      typeDefs: `type Order {
        url: String
      }`,
      resolvers: {
        Mutation: {
          createOrder: {
            resolve: async (parent, args, ctx) => {
              const { toEntityResponse } = strapi.service(
                "plugin::graphql.format"
              ).returnTypes;
              const { products, username, email } = args.data;

              try {
                // retrieve item information
                const lineItems = await Promise.all(
                  JSON.parse(products).map(async (product) => {
                    const item = await strapi.entityService.findOne(
                      "api::item.item",
                      product.id
                    );

                    return {
                      price_data: {
                        currency: "usd",
                        product_data: {
                          name: item.name,
                        },
                        unit_amount: item.price * 100,
                      },
                      quantity: product.qty,
                    };
                  })
                );

                // create a stripe session
                const session = await stripe.checkout.sessions.create({
                  payment_method_types: ["card"],
                  customer_email: email,
                  mode: "payment",
                  success_url:
                    "http://localhost:3000/success?session={CHECKOUT_SESSION_ID}&confirmed=true",
                  cancel_url: "http://localhost:3000/checkout?canceled=true",
                  line_items: lineItems,
                });

                // create the item
                const createdOrder = await strapi.entityService.create(
                  "api::order.order",
                  {
                    data: { username, products, stripeSessionId: session.id },
                  }
                );

                // console.log(createdOrder);
                // return the session id
                return toEntityResponse({ ...createdOrder, url: session.url });
              } catch (error) {
                // ctx
                console.log(error);
                // throw error
                return {
                  errors: [
                    {
                      message: error.message,
                      extensions: {
                        error: { message: error.message },
                        code: error.type,
                      },
                    },
                  ],
                };
              }
            },
          },
        },
      },
      resolversConfig: {},
    });
    extensionService.use(extension);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
