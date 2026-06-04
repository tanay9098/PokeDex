// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonMarketplace
 * @dev Marketplace for trading Pokemon NFTs on Polygon with ERC2981 royalty enforcement
 */
contract PokemonMarketplace is ReentrancyGuard, Ownable {
    IERC721 public pokemonNFT;

    uint256 public platformFee = 25; // 2.5% fee
    uint256 public feeDenominator = 1000;

    address public feeRecipient;

    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    struct Offer {
        address offerer;
        uint256 amount;
        uint256 expiresAt;
        bool active;
    }

    // Token ID => Listing
    mapping(uint256 => Listing) public listings;

    // Token ID => Offer ID => Offer
    mapping(uint256 => mapping(uint256 => Offer)) public offers;

    uint256 private _offerIdCounter;

    event ListingCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event ListingCancelled(uint256 indexed tokenId, address indexed seller);

    event ListingSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    event OfferMade(
        uint256 indexed tokenId,
        uint256 indexed offerId,
        address indexed offerer,
        uint256 amount
    );

    event OfferAccepted(
        uint256 indexed tokenId,
        uint256 indexed offerId,
        address indexed seller
    );

    event OfferCancelled(
        uint256 indexed tokenId,
        uint256 indexed offerId,
        address indexed offerer
    );

    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed receiver,
        uint256 amount
    );

    constructor(address _pokemonNFT, address _feeRecipient) Ownable(msg.sender) {
        pokemonNFT = IERC721(_pokemonNFT);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev List Pokemon for sale
     */
    function listPokemon(uint256 tokenId, uint256 price) public nonReentrant {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "You don't own this Pokemon");
        require(price > 0, "Price must be greater than 0");

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ListingCreated(tokenId, msg.sender, price);
    }

    /**
     * @dev Cancel listing
     */
    function cancelListing(uint256 tokenId) public nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "You didn't create this listing");
        require(listing.active, "Listing is not active");

        listings[tokenId].active = false;

        emit ListingCancelled(tokenId, msg.sender);
    }

    /**
     * @dev Buy listed Pokemon — enforces ERC2981 royalties on every secondary sale
     */
    function buyPokemon(uint256 tokenId) public payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Pokemon is not for sale");
        require(msg.value == listing.price, "Incorrect payment amount");

        // Calculate platform fee
        uint256 fee = (listing.price * platformFee) / feeDenominator;
        uint256 remaining = listing.price - fee;

        // Calculate and pay ERC2981 royalty if supported
        uint256 royaltyAmount = 0;
        if (IERC165(address(pokemonNFT)).supportsInterface(type(IERC2981).interfaceId)) {
            (address royaltyReceiver, uint256 royalty) = IERC2981(address(pokemonNFT)).royaltyInfo(tokenId, listing.price);
            if (royalty > 0 && royaltyReceiver != address(0) && royalty <= remaining) {
                royaltyAmount = royalty;
                remaining -= royaltyAmount;
                (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royaltyAmount}("");
                require(royaltySuccess, "Royalty payment failed");
                emit RoyaltyPaid(tokenId, royaltyReceiver, royaltyAmount);
            }
        }

        // Update listing
        listings[tokenId].active = false;

        // Transfer NFT
        pokemonNFT.transferFrom(listing.seller, msg.sender, tokenId);

        // Transfer payments
        (bool success, ) = payable(listing.seller).call{value: remaining}("");
        require(success, "Payment to seller failed");

        (bool feeSuccess, ) = payable(feeRecipient).call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        emit ListingSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Make an offer on Pokemon
     */
    function makeOffer(
        uint256 tokenId,
        uint256 expiresAt
    ) public payable nonReentrant {
        require(msg.value > 0, "Offer amount must be greater than 0");
        require(expiresAt > block.timestamp, "Expiry time must be in the future");

        uint256 offerId = _offerIdCounter;
        _offerIdCounter++;

        offers[tokenId][offerId] = Offer({
            offerer: msg.sender,
            amount: msg.value,
            expiresAt: expiresAt,
            active: true
        });

        emit OfferMade(tokenId, offerId, msg.sender, msg.value);
    }

    /**
     * @dev Accept an offer — enforces ERC2981 royalties
     */
    function acceptOffer(uint256 tokenId, uint256 offerId) public nonReentrant {
        require(pokemonNFT.ownerOf(tokenId) == msg.sender, "You don't own this Pokemon");

        Offer memory offer = offers[tokenId][offerId];
        require(offer.active, "Offer is not active");
        require(offer.expiresAt > block.timestamp, "Offer has expired");

        // Calculate platform fee
        uint256 fee = (offer.amount * platformFee) / feeDenominator;
        uint256 remaining = offer.amount - fee;

        // Calculate and pay ERC2981 royalty if supported
        if (IERC165(address(pokemonNFT)).supportsInterface(type(IERC2981).interfaceId)) {
            (address royaltyReceiver, uint256 royalty) = IERC2981(address(pokemonNFT)).royaltyInfo(tokenId, offer.amount);
            if (royalty > 0 && royaltyReceiver != address(0) && royalty <= remaining) {
                remaining -= royalty;
                (bool royaltySuccess, ) = payable(royaltyReceiver).call{value: royalty}("");
                require(royaltySuccess, "Royalty payment failed");
                emit RoyaltyPaid(tokenId, royaltyReceiver, royalty);
            }
        }

        // Update offer
        offers[tokenId][offerId].active = false;

        // Transfer NFT
        pokemonNFT.transferFrom(msg.sender, offer.offerer, tokenId);

        // Transfer payments
        (bool success, ) = payable(msg.sender).call{value: remaining}("");
        require(success, "Payment to seller failed");

        (bool feeSuccess, ) = payable(feeRecipient).call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        emit OfferAccepted(tokenId, offerId, msg.sender);
    }

    /**
     * @dev Cancel an offer
     */
    function cancelOffer(uint256 tokenId, uint256 offerId) public nonReentrant {
        Offer memory offer = offers[tokenId][offerId];
        require(offer.offerer == msg.sender, "You didn't make this offer");
        require(offer.active, "Offer is not active");

        offers[tokenId][offerId].active = false;

        // Refund offer amount
        (bool success, ) = payable(msg.sender).call{value: offer.amount}("");
        require(success, "Refund failed");

        emit OfferCancelled(tokenId, offerId, msg.sender);
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 100, "Fee cannot exceed 10%");
        platformFee = newFee;
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address newRecipient) public onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @dev Get active listing
     */
    function getListing(uint256 tokenId) public view returns (Listing memory) {
        return listings[tokenId];
    }

    /**
     * @dev Get active offer
     */
    function getOffer(uint256 tokenId, uint256 offerId)
        public
        view
        returns (Offer memory)
    {
        return offers[tokenId][offerId];
    }
}
