import {
    allocate,
    entryPoint,
    execute,
    IPreContractCallJP,
    PreContractCallInput,
    IPostContractCallJP,
    PostContractCallInput,
    ethereum,
    sys, BytesData,
    uint8ArrayToHex,
} from "@artela/aspect-libs";

import {Protobuf} from "as-proto/assembly";
import {MutableStateValue} from "@artela/aspect-libs/components/aspect/aspect-state";

/**
 * Please describe what functionality this aspect needs to implement.
 *
 * About the concept of Aspect @see [join-point](https://docs.artela.network/develop/core-concepts/join-point)
 * How to develop an Aspect  @see [Aspect Structure](https://docs.artela.network/develop/reference/aspect-lib/aspect-structure)
 */
class Aspect implements IPostContractCallJP, IPreContractCallJP {
    static MaxLossValue = 100
    static MinLossValue = 0

    /**
     * isOwner is the governance account implemented by the Aspect, when any of the governance operation
     * (including upgrade, config, destroy) is made, isOwner method will be invoked to check
     * against the initiator's account to make sure it has the permission.
     *
     * @param sender address of the transaction
     * @return true if check success, false if check fail
     */
    isOwner(sender: Uint8Array): bool {
        return true;
    }

    /**
     *
     * @param input
     */
    preContractCall(input: PreContractCallInput): void {
        // 获取是否需要计算和转移的具体nft信息（转移次数、当前折损值）
        // get the contract address, from address and build the storage prefix
        const contractAddress = uint8ArrayToHex(input.call!.to);
        let {needCal, nftIndex, transferTimes, currentLoss} = this.getNftLossNum(contractAddress);
        if (!needCal) {
            return
        }
        // 判断是否已经被销毁了
        sys.require(!this.isDestroyEquipment(contractAddress, nftIndex), "the equipment already destroy")
        // 读取配置，确定曲线计算方法
        let lossFunc = this.getSelectLossFunc()
        // 计算折损结果
        const postLoss: u64 = lossFunc(transferTimes, currentLoss)

        // 检查是否已经折损，如果折损则抛异常
        if (postLoss <= Aspect.MinLossValue) {
            sys.revert("The loss limit of this nft has been reached");
            // 判断是否要销毁
            const needDestroy = sys.aspect.property.get<boolean>("needDestroy");
            if (needDestroy) {
                // 处理销毁逻辑
                this.destroyEquipment(contractAddress, nftIndex)
            }
        }
        // 更新数值
        const storagePrefix = `${contractAddress}:${nftIndex}`;
        new MutableStateValue<u64>(storagePrefix + "#transferTimes").set(transferTimes + 1);
        new MutableStateValue<u64>(storagePrefix + "#currentLoss").set(postLoss);
    }

    // 获取要计算的nft
    getNftLossNum(contractAddress: string): { needCal: bool, nftIndex: string, transferTimes: u64, currentLoss: u64 } {
        let txData = sys.hostApi.runtimeContext.get("tx.data");
        let nftIndexStr = ''
        const txDataPt = Protobuf.decode<BytesData>(txData, BytesData.decode);
        const parentCallMethod = ethereum.parseMethodSig(txDataPt.data);
        // 如果转移
        if (parentCallMethod == ethereum.computeMethodSig("Transfer")) {
            nftIndexStr = uint8ArrayToHex(txDataPt.data.slice(36, 68));
        } else if (parentCallMethod == ethereum.computeMethodSig("TransferFrom")) {
            // 如果代理转移
            nftIndexStr = uint8ArrayToHex(txDataPt.data.slice(68, 100));
        } else {
            // 不用计算，直接返回
            return {needCal: false, nftIndex: '', transferTimes: 0, currentLoss: 0};
        }
        const storagePrefix = `${contractAddress}:${nftIndexStr}`;
        // 获取nft信息
        const transferTimes = sys.aspect.mutableState.get<u64>(storagePrefix + "#transferTimes");
        const currentLoss = sys.aspect.mutableState.get<u64>(storagePrefix + "#currentLoss");
        // 如果之前没有转移记录则设置为无损状态值
        if (transferTimes.unwrap() == 0) {
            return {
                needCal: true,
                nftIndex: nftIndexStr,
                transferTimes: transferTimes.unwrap(),
                currentLoss: Aspect.MaxLossValue
            };
        }
        return {
            needCal: true,
            nftIndex: nftIndexStr,
            transferTimes: transferTimes.unwrap(),
            currentLoss: currentLoss.unwrap()
        };
    }

    // 获取选择的损耗函数
    getSelectLossFunc(): any {
        const funcType = sys.aspect.property.get<u64>("calFuncType");
        switch (funcType) {
            case 1:
                return this.calLineLoss;
            case 2:
                return this.calStepLoss;
            default:
                return this.calLineLoss;
        }
    }

    // 线性衰减函数（只和转移次数相关）
    calLineLoss(transferTimes: u64, _: u64): u64 {
        // 每次衰减10个点
        let result = Aspect.MaxLossValue - 10 * transferTimes;
        return result > Aspect.MinLossValue ? result : Aspect.MinLossValue;
    }

    // 逐步衰减函数（只和当前衰减值有关）
    calStepLoss(_: u64, currentValue: u64): u64 {
        // 每次衰减10%
        return currentValue * 0.9;
    }

    // 销毁
    destroyEquipment(contractAddress: string, nftIndex: string): void {
        new MutableStateValue<boolean>(contractAddress + nftIndex + "#destroy").set(true);
    }

    // 判断是否已经销毁
    isDestroyEquipment(contractAddress: string, nftIndex: string): boolean {
        return sys.aspect.mutableState.get<boolean>(contractAddress + nftIndex + "#destroy").unwrap();
    }

    /**
     * postContractCall is a join-point which will be invoked after a contract call has finished.
     *
     * @param input input to the current join point
     */
    postContractCall(input: PostContractCallInput): void {
    }

}

// 2.register aspect Instance
const aspect = new Aspect()
entryPoint.setAspect(aspect)

// 3.must export it
export {execute, allocate}

