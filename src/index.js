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
      typeDefs: ``,
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
                  products.map(async (product) => {
                    const item = await strapi
                      .service("api::item.item")
                      .findOne(product.id);

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
                    "http://localhost:3000/success?session={CHECKOUT_SESSION_ID}",
                  cancel_url: "http://localhost:3000/",
                  line_items: lineItems,
                });

                // create the item
                const createdOrder = await strapi
                  .service("api::order.order")
                  .create({
                    data: { username, products, stripeSessionId: session.id },
                  });

                // return the session id
                return toEntityResponse(createdOrder);
              } catch (error) {
                // ctx
                console.log(error);
                return {
                  error: { message: "There was a problem creating the charge" },
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
